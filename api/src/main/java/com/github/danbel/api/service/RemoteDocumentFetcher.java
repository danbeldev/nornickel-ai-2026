package com.github.danbel.api.service;

import com.github.danbel.api.config.AppProperties;
import com.github.danbel.api.model.enums.DocumentType;
import lombok.RequiredArgsConstructor;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.http.ContentDisposition;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.Inet6Address;
import java.net.InetAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class RemoteDocumentFetcher {

    private static final Map<String, DocumentType> CONTENT_TYPES = Map.ofEntries(
            Map.entry("text/html", DocumentType.HTML),
            Map.entry("application/xhtml+xml", DocumentType.HTML),
            Map.entry("application/pdf", DocumentType.PDF),
            Map.entry(
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    DocumentType.DOCX
            ),
            Map.entry(
                    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                    DocumentType.PPTX
            ),
            Map.entry(
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    DocumentType.XLSX
            ),
            Map.entry("text/csv", DocumentType.CSV),
            Map.entry("application/csv", DocumentType.CSV)
    );

    private final AppProperties properties;

    public RemoteDocument fetch(String rawUrl) {
        if (properties.getDemo().isEnabled() && isMdpiDemoUrl(rawUrl)) {
            return mdpiDemoDocument();
        }
        AppProperties.RemoteDocuments config = properties.getRemoteDocuments();
        URI uri = safePublicUri(rawUrl);
        HttpResponse<InputStream> response = send(uri, config, 0);
        String contentType = normalizeContentType(
                response.headers().firstValue("Content-Type").orElse("")
        );
        long declaredSize = response.headers()
                .firstValueAsLong("Content-Length")
                .orElse(-1L);
        if (declaredSize > config.getMaxDownloadBytes()) {
            closeQuietly(response.body());
            throw new IllegalArgumentException(
                    "Размер документа превышает допустимый лимит "
                            + config.getMaxDownloadBytes() + " байт"
            );
        }

        byte[] content;
        try (InputStream body = response.body()) {
            content = body.readNBytes(config.getMaxDownloadBytes() + 1);
        } catch (IOException exception) {
            throw new IllegalArgumentException(
                    "Не удалось скачать документ по указанной ссылке",
                    exception
            );
        }
        if (content.length > config.getMaxDownloadBytes()) {
            throw new IllegalArgumentException(
                    "Размер документа превышает допустимый лимит "
                            + config.getMaxDownloadBytes() + " байт"
            );
        }
        if (content.length == 0) {
            throw new IllegalArgumentException("Удалённый документ пуст");
        }

        URI finalUri = response.uri();
        DocumentType type = resolveType(finalUri, contentType);
        String filename = resolveFilename(
                response.headers().firstValue("Content-Disposition").orElse(null),
                finalUri,
                type
        );
        OffsetDateTime headerDate = parseDate(
                response.headers().firstValue("Last-Modified").orElse(null)
        );
        if (type != DocumentType.HTML) {
            return new RemoteDocument(
                    finalUri.toString(),
                    filename,
                    contentTypeFor(type, contentType),
                    content,
                    titleFromFilename(filename),
                    finalUri.getHost(),
                    headerDate,
                    "Документ загружен из внешнего источника."
            );
        }

        Document html;
        try {
            html = Jsoup.parse(
                    new ByteArrayInputStream(content),
                    null,
                    finalUri.toString()
            );
        } catch (IOException exception) {
            throw new IllegalArgumentException(
                    "Не удалось разобрать HTML-страницу",
                    exception
            );
        }
        String title = truncate(firstNonBlank(
                content(html, "meta[property=og:title]"),
                content(html, "meta[name=twitter:title]"),
                text(html, "article h1"),
                text(html, "main h1"),
                html.title(),
                finalUri.getHost()
        ), 512);
        String author = truncate(firstNonBlank(
                content(html, "meta[name=author]"),
                content(html, "meta[property=article:author]"),
                text(html, "[rel=author]"),
                text(html, ".author"),
                finalUri.getHost()
        ), 512);
        OffsetDateTime publishedAt = firstDate(
                content(html, "meta[property=article:published_time]"),
                content(html, "meta[name=date]"),
                content(html, "meta[name=pubdate]"),
                content(html, "meta[itemprop=datePublished]"),
                attribute(html, "time[datetime]", "datetime"),
                headerDate == null ? null : headerDate.toString()
        );
        String description = firstNonBlank(
                content(html, "meta[name=description]"),
                content(html, "meta[property=og:description]"),
                "Веб-статья, добавленная в базу знаний."
        );
        return new RemoteDocument(
                finalUri.toString(),
                filename,
                "text/html; charset=UTF-8",
                content,
                title,
                author,
                publishedAt,
                description
        );
    }

    private HttpResponse<InputStream> send(
            URI uri,
            AppProperties.RemoteDocuments config,
            int redirectCount
    ) {
        if (redirectCount > config.getMaxRedirects()) {
            throw new IllegalArgumentException(
                    "Слишком много перенаправлений при загрузке документа"
            );
        }
        try {
            HttpRequest request = HttpRequest.newBuilder(uri)
                    .timeout(Duration.ofSeconds(config.getRequestTimeoutSeconds()))
                    .header(
                            "User-Agent",
                            "Mozilla/5.0 (compatible; NornickelKnowledgeBot/1.0)"
                    )
                    .header(
                            "Accept",
                            "text/html,application/xhtml+xml,application/pdf,"
                                    + "application/vnd.openxmlformats-officedocument."
                                    + "wordprocessingml.document,"
                                    + "application/vnd.openxmlformats-officedocument."
                                    + "presentationml.presentation,"
                                    + "application/vnd.openxmlformats-officedocument."
                                    + "spreadsheetml.sheet,text/csv;q=0.9"
                    )
                    .GET()
                    .build();
            HttpResponse<InputStream> response = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(config.getRequestTimeoutSeconds()))
                    .followRedirects(HttpClient.Redirect.NEVER)
                    .build()
                    .send(request, HttpResponse.BodyHandlers.ofInputStream());
            if (response.statusCode() >= 300 && response.statusCode() < 400) {
                String location = response.headers()
                        .firstValue("Location")
                        .orElseThrow(() -> new IllegalArgumentException(
                                "Удалённый сервер вернул перенаправление без адреса"
                        ));
                closeQuietly(response.body());
                URI redirected = safePublicUri(uri.resolve(location).toString());
                return send(redirected, config, redirectCount + 1);
            }
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                closeQuietly(response.body());
                throw new IllegalArgumentException(
                        "Удалённый сервер вернул HTTP " + response.statusCode()
                );
            }
            return response;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalArgumentException("Загрузка документа была прервана", exception);
        } catch (IOException exception) {
            throw new IllegalArgumentException(
                    "Не удалось обратиться к указанному адресу",
                    exception
            );
        }
    }

    private URI safePublicUri(String value) {
        final URI uri;
        if (value == null || value.isBlank() || value.length() > 2048) {
            throw new IllegalArgumentException("Указана некорректная ссылка");
        }
        try {
            uri = URI.create(value.strip());
        } catch (Exception exception) {
            throw new IllegalArgumentException("Указана некорректная ссылка", exception);
        }
        if (!"http".equalsIgnoreCase(uri.getScheme())
                && !"https".equalsIgnoreCase(uri.getScheme())) {
            throw new IllegalArgumentException("Поддерживаются только HTTP и HTTPS ссылки");
        }
        if (uri.getHost() == null
                || uri.getHost().isBlank()
                || uri.getUserInfo() != null) {
            throw new IllegalArgumentException("Ссылка не содержит допустимый публичный адрес");
        }
        String host = uri.getHost().toLowerCase(Locale.ROOT);
        if ("localhost".equals(host) || host.endsWith(".localhost") || host.endsWith(".local")) {
            throw new IllegalArgumentException("Внутренние адреса запрещены");
        }
        try {
            for (InetAddress address : InetAddress.getAllByName(uri.getHost())) {
                if (address.isAnyLocalAddress()
                        || address.isLoopbackAddress()
                        || address.isLinkLocalAddress()
                        || address.isSiteLocalAddress()
                        || address.isMulticastAddress()
                        || isUniqueLocalIpv6(address)) {
                    throw new IllegalArgumentException("Внутренние адреса запрещены");
                }
            }
        } catch (IOException exception) {
            throw new IllegalArgumentException("Не удалось определить адрес сайта", exception);
        }
        return uri;
    }

    private boolean isUniqueLocalIpv6(InetAddress address) {
        if (!(address instanceof Inet6Address)) {
            return false;
        }
        byte first = address.getAddress()[0];
        return (first & 0xFE) == 0xFC;
    }

    private DocumentType resolveType(URI uri, String contentType) {
        DocumentType byContentType = CONTENT_TYPES.get(contentType);
        if (byContentType != null) {
            return byContentType;
        }
        String path = uri.getPath() == null ? "" : uri.getPath().toLowerCase(Locale.ROOT);
        for (DocumentType type : DocumentType.values()) {
            if (path.endsWith("." + type.getValue())) {
                return type;
            }
        }
        throw new IllegalArgumentException(
                "Ссылка должна вести на HTML-статью, PDF, DOCX, PPTX, XLSX или CSV"
        );
    }

    private String resolveFilename(
            String contentDisposition,
            URI uri,
            DocumentType type
    ) {
        if (contentDisposition != null) {
            try {
                String filename = ContentDisposition
                        .parse(contentDisposition)
                        .getFilename();
                if (filename != null && !filename.isBlank()) {
                    return ensureExtension(filename, type);
                }
            } catch (Exception ignored) {
                // Fall back to the URL path.
            }
        }
        String path = uri.getPath();
        if (path != null && !path.isBlank() && !path.endsWith("/")) {
            String filename = path.substring(path.lastIndexOf('/') + 1);
            if (!filename.isBlank()) {
                return ensureExtension(filename, type);
            }
        }
        return "web-document." + type.getValue();
    }

    private String ensureExtension(String filename, DocumentType type) {
        String normalized = filename.replaceAll("[\\\\/:*?\"<>|\\r\\n]+", "_");
        normalized = truncate(normalized, 180);
        return normalized.toLowerCase(Locale.ROOT).endsWith("." + type.getValue())
                ? normalized
                : normalized + "." + type.getValue();
    }

    private String titleFromFilename(String filename) {
        return filename.replaceFirst("(?i)\\.[^.]+$", "").replace('_', ' ').strip();
    }

    private String normalizeContentType(String contentType) {
        int separator = contentType.indexOf(';');
        return (separator >= 0 ? contentType.substring(0, separator) : contentType)
                .strip()
                .toLowerCase(Locale.ROOT);
    }

    private String contentTypeFor(DocumentType type, String detected) {
        if (detected != null && !detected.isBlank()
                && !"application/octet-stream".equals(detected)) {
            return detected;
        }
        return switch (type) {
            case PDF -> "application/pdf";
            case DOCX -> "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            case PPTX -> "application/vnd.openxmlformats-officedocument.presentationml.presentation";
            case XLSX -> "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            case CSV -> "text/csv";
            case HTML -> "text/html";
        };
    }

    private String content(Document document, String selector) {
        Element element = document.selectFirst(selector);
        return element == null ? null : element.attr("content").strip();
    }

    private String attribute(Document document, String selector, String attribute) {
        Element element = document.selectFirst(selector);
        return element == null ? null : element.attr(attribute).strip();
    }

    private String text(Document document, String selector) {
        Element element = document.selectFirst(selector);
        return element == null ? null : element.text().strip();
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.strip();
            }
        }
        return null;
    }

    private String truncate(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength).strip();
    }

    private OffsetDateTime firstDate(String... values) {
        for (String value : values) {
            OffsetDateTime date = parseDate(value);
            if (date != null) {
                return date;
            }
        }
        return null;
    }

    private OffsetDateTime parseDate(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.strip();
        try {
            return OffsetDateTime.parse(normalized);
        } catch (Exception ignored) {
        }
        try {
            return Instant.parse(normalized).atOffset(ZoneOffset.UTC);
        } catch (Exception ignored) {
        }
        try {
            return OffsetDateTime.parse(
                    normalized,
                    DateTimeFormatter.RFC_1123_DATE_TIME
            );
        } catch (Exception ignored) {
        }
        try {
            return LocalDate.parse(normalized).atStartOfDay().atOffset(ZoneOffset.UTC);
        } catch (Exception ignored) {
            return null;
        }
    }

    private boolean isMdpiDemoUrl(String value) {
        return value != null
                && value.strip().replaceFirst("/+$", "").equalsIgnoreCase(
                "https://www.mdpi.com/2076-3921/15/7/848"
        );
    }

    private RemoteDocument mdpiDemoDocument() {
        String sourceUrl = "https://www.mdpi.com/2076-3921/15/7/848";
        String title = "Toxicity Evaluation of Nano-Sized Particles by Analysis "
                + "of mtDNA Content and Expression Levels of Genes Required for "
                + "mtDNA Maintenance: A Meta-Analysis of Pre-Clinical Studies";
        String html = """
                <!doctype html>
                <html lang="en">
                <head>
                  <meta charset="utf-8">
                  <title>%s</title>
                  <meta name="author" content="Qiwen Liu, Yunxia Liang, Dongli Xie, Yiming Xu, Dianliang Wang, Xiaogang Luo">
                  <meta property="article:published_time" content="2026-07-04T00:00:00Z">
                  <meta name="description" content="Meta-analysis of mitochondrial DNA alterations after exposure to nano-sized particles.">
                </head>
                <body>
                  <article>
                    <h1>%s</h1>
                    <p>Meta-analysis of 19 in vitro studies comprising 69 datasets
                    showed that exposure to nano-sized particles significantly reduced
                    mtDNA content (standardized mean difference −1.08; p = 0.001).</p>
                    <p>ND1, COX1, COX2, CYTB and ATP6 were down-regulated.
                    SIRT1, PGC-1α and TFAM, as well as MFN1, MFN2 and OPA1,
                    were down-regulated, while DRP1 and FIS1 were up-regulated.</p>
                    <p>The authors note statistical heterogeneity, a relatively small
                    number of studies for some variables, predominance of studies from
                    Asian countries and the need for additional pre-clinical and
                    clinical validation.</p>
                  </article>
                </body>
                </html>
                """.formatted(title, title);
        return new RemoteDocument(
                sourceUrl,
                "antioxidants-15-00848.html",
                "text/html; charset=UTF-8",
                html.getBytes(StandardCharsets.UTF_8),
                title,
                "Qiwen Liu, Yunxia Liang, Dongli Xie, Yiming Xu, "
                        + "Dianliang Wang, Xiaogang Luo",
                OffsetDateTime.parse("2026-07-04T00:00:00Z"),
                "Метаанализ изменений митохондриальной ДНК при воздействии наночастиц."
        );
    }

    private void closeQuietly(InputStream stream) {
        try {
            stream.close();
        } catch (Exception ignored) {
        }
    }

    public record RemoteDocument(
            String sourceUrl,
            String filename,
            String contentType,
            byte[] content,
            String title,
            String author,
            OffsetDateTime publishedAt,
            String description
    ) {
    }
}
