package com.github.danbel.api.service;

import com.github.danbel.api.config.AppProperties;
import com.github.danbel.api.dto.chat.ChatCitationDto;
import com.github.danbel.api.dto.chat.WebSearchSourceDto;
import lombok.RequiredArgsConstructor;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.parser.Parser;
import org.springframework.stereotype.Service;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.io.InputStream;
import java.net.InetAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class WebSearchService {

    private static final Pattern WORD_SEPARATOR = Pattern.compile("[^\\p{L}\\p{N}]+");
    private static final Pattern URL = Pattern.compile(
            "(?iu)https?://[^\\s<>\"']+"
    );
    private static final Set<String> QUERY_STOP_WORDS = Set.of(
            "и", "в", "во", "на", "о", "об", "по", "для", "что", "как",
            "это", "из", "к", "с", "со", "the", "a", "an", "of", "to",
            "in", "on", "for", "and", "or", "is", "are"
    );

    private final AppProperties properties;
    private final ObjectMapper objectMapper;
    private final DemoAiService demoAiService;

    public List<SearchLink> searchLinks(String query) {
        if (demoAiService.enabled()) {
            return demoAiService.webSources().stream()
                    .map(source -> new SearchLink(
                            source.url(), source.title(),
                            source.publishedAt(), source.quote()
                    ))
                    .toList();
        }
        AppProperties.WebSearch config = config();
        Map<String, Object> requestPayload = Map.of(
                "query", Map.of(
                        "searchType", "SEARCH_TYPE_RU",
                        "queryText", query,
                        "familyMode", "FAMILY_MODE_MODERATE",
                        "fixTypoMode", "FIX_TYPO_MODE_ON"
                ),
                "groupSpec", Map.of(
                        "groupMode", "GROUP_MODE_DEEP",
                        "groupsOnPage", config.getResultLimit(),
                        "docsInGroup", 1
                ),
                "maxPassages", 4,
                "region", "225",
                "l10N", "LOCALIZATION_RU",
                "folderId", config.getFolderId(),
                "responseFormat", "FORMAT_XML"
        );

        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(config.getBaseUrl()))
                    .timeout(Duration.ofSeconds(config.getRequestTimeoutSeconds()))
                    .header("Authorization", "Api-Key " + config.getApiKey())
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(
                            objectMapper.writeValueAsString(requestPayload),
                            StandardCharsets.UTF_8
                    ))
                    .build();
            HttpResponse<String> response = httpClient(config)
                    .send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                if (response.statusCode() == 401 || response.statusCode() == 403) {
                    throw new WebSearchUnavailableException(
                            "У API-ключа нет доступа к Yandex Search API"
                    );
                }
                throw new WebSearchUnavailableException(
                        "Yandex Search API вернул HTTP " + response.statusCode()
                );
            }
            JsonNode root = objectMapper.readTree(response.body());
            JsonNode rawDataNode = root.get("rawData");
            if (rawDataNode == null || rawDataNode.asText().isBlank()) {
                throw new WebSearchUnavailableException(
                        "Yandex Search API не вернул результаты"
                );
            }
            return parseSearchXml(decodeRawData(rawDataNode.asText()), config.getResultLimit());
        } catch (JacksonException exception) {
            throw new WebSearchUnavailableException(
                    "Yandex Search API вернул некорректный ответ",
                    exception
            );
        } catch (IOException exception) {
            throw new WebSearchUnavailableException(
                    "Не удалось обратиться к Yandex Search API",
                    exception
            );
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new WebSearchUnavailableException(
                    "Поиск в открытых источниках был прерван",
                    exception
            );
        }
    }

    public List<WebSearchSourceDto> readSources(
            List<SearchLink> links,
            String query
    ) {
        if (demoAiService.enabled()) {
            return demoAiService.webSources();
        }
        AppProperties.WebSearch config = config();
        return links.parallelStream()
                .limit(config.getResultLimit())
                .map(link -> readSource(link, query, config))
                .filter(Objects::nonNull)
                .toList();
    }

    public List<String> extractUrls(String query) {
        if (query == null || query.isBlank()) {
            return List.of();
        }
        List<String> urls = new ArrayList<>();
        var matcher = URL.matcher(query);
        while (matcher.find()) {
            String url = matcher.group().replaceFirst("[),.;!?]+$", "");
            if (!urls.contains(url)) {
                urls.add(url);
            }
        }
        return urls;
    }

    public List<WebSearchSourceDto> readDirectUrls(
            List<String> urls,
            String query
    ) {
        if (demoAiService.enabled()) {
            return demoAiService.webSources();
        }
        AppProperties.WebSearch config = config();
        return urls.stream()
                .limit(config.getResultLimit())
                .map(url -> readSource(
                        new SearchLink(url, url, null, ""),
                        query,
                        config
                ))
                .filter(Objects::nonNull)
                .toList();
    }

    public List<ChatCitationDto> toCitations(List<WebSearchSourceDto> sources) {
        return sources.stream()
                .map(source -> new ChatCitationDto(
                        source.id(),
                        null,
                        null,
                        source.title(),
                        source.quote(),
                        null,
                        List.of(),
                        "web",
                        source.url(),
                        source.publishedAt(),
                        source.quote(),
                        null,
                        null
                ))
                .toList();
    }

    private WebSearchSourceDto readSource(
            SearchLink link,
            String query,
            AppProperties.WebSearch config
    ) {
        String title = link.title();
        String publishedAt = link.publishedAt();
        String content = link.snippet();
        URI uri;
        try {
            uri = safePublicUri(link.url());
        } catch (Exception ignored) {
            return null;
        }
        try {
            HttpRequest request = HttpRequest.newBuilder(uri)
                    .timeout(Duration.ofSeconds(config.getRequestTimeoutSeconds()))
                    .header(
                            "User-Agent",
                            "Mozilla/5.0 (compatible; NornickelResearchBot/1.0)"
                    )
                    .header(
                            "Accept",
                            "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.2"
                    )
                    .GET()
                    .build();
            HttpResponse<InputStream> response = httpClient(config)
                    .send(request, HttpResponse.BodyHandlers.ofInputStream());
            String contentType = response.headers()
                    .firstValue("Content-Type")
                    .orElse("");
            try (InputStream body = response.body()) {
                if (response.statusCode() >= 200
                        && response.statusCode() < 300
                        && (contentType.contains("text/html")
                        || contentType.contains("application/xhtml+xml")
                        || contentType.contains("text/plain"))) {
                    byte[] bytes = body.readNBytes(config.getMaxDownloadBytes());
                    String html = new String(bytes, StandardCharsets.UTF_8);
                    if (contentType.contains("html")) {
                        Document document = Jsoup.parse(html, link.url());
                        document.select(
                                "script,style,noscript,svg,form,nav,footer,header,aside"
                        ).remove();
                        if (!document.title().isBlank()) {
                            title = document.title();
                        }
                        String pageDate = firstContent(
                                document,
                                "meta[property=article:published_time]",
                                "meta[name=date]",
                                "meta[name=pubdate]",
                                "time[datetime]"
                        );
                        if (publishedAt == null && pageDate != null) {
                            publishedAt = pageDate;
                        }
                        Element main = document.selectFirst("article,main");
                        String pageText = main == null
                                ? document.body().text()
                                : main.text();
                        content = relevantExcerpt(
                                pageText,
                                query,
                                config.getMaxContentCharacters()
                        );
                    } else {
                        content = relevantExcerpt(
                                html,
                                query,
                                config.getMaxContentCharacters()
                        );
                    }
                }
            }
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
        } catch (Exception ignored) {
            // Search passages remain available when a page blocks automated reading.
        }

        String normalizedContent = normalizeText(content);
        if (normalizedContent.isBlank()) {
            normalizedContent = "Текст страницы недоступен; использован результат поиска.";
        }
        return new WebSearchSourceDto(
                "web-" + UUID.nameUUIDFromBytes(
                        link.url().getBytes(StandardCharsets.UTF_8)
                ),
                title == null || title.isBlank() ? link.url() : title,
                link.url(),
                publishedAt,
                truncate(normalizedContent, 700),
                truncate(normalizedContent, config.getMaxContentCharacters())
        );
    }

    private List<SearchLink> parseSearchXml(String xml, int limit) {
        Document document = Jsoup.parse(xml, "", Parser.xmlParser());
        List<SearchLink> links = new ArrayList<>();
        for (Element result : document.select("group doc")) {
            String url = text(result, "url");
            if (url == null || url.isBlank()) {
                continue;
            }
            String title = text(result, "title");
            String publishedAt = firstNonBlank(
                    text(result, "modtime"),
                    text(result, "last-modified")
            );
            String snippet = result.select("passages passage").stream()
                    .map(Element::text)
                    .filter(value -> !value.isBlank())
                    .distinct()
                    .reduce((left, right) -> left + " " + right)
                    .orElseGet(() -> firstNonBlank(
                            text(result, "headline"),
                            text(result, "description")
                    ));
            links.add(new SearchLink(
                    url,
                    title == null ? url : title,
                    publishedAt,
                    snippet == null ? "" : snippet
            ));
            if (links.size() >= limit) {
                break;
            }
        }
        return links;
    }

    private String relevantExcerpt(String text, String query, int maxCharacters) {
        String normalized = normalizeText(text);
        if (normalized.length() <= maxCharacters) {
            return normalized;
        }
        Set<String> queryWords = queryWords(query);
        List<String> passages = Pattern.compile("(?<=[.!?])\\s+|\\n+")
                .splitAsStream(normalized)
                .map(String::strip)
                .filter(value -> value.length() >= 40)
                .sorted(Comparator.comparingInt(
                        (String value) -> overlap(value, queryWords)
                ).reversed())
                .limit(12)
                .toList();
        StringBuilder result = new StringBuilder();
        for (String passage : passages) {
            if (result.length() + passage.length() + 1 > maxCharacters) {
                continue;
            }
            if (!result.isEmpty()) {
                result.append(' ');
            }
            result.append(passage);
        }
        return result.isEmpty()
                ? truncate(normalized, maxCharacters)
                : result.toString();
    }

    private Set<String> queryWords(String value) {
        Set<String> result = new LinkedHashSet<>();
        for (String word : WORD_SEPARATOR.split(value.toLowerCase(Locale.ROOT))) {
            if (word.length() >= 3 && !QUERY_STOP_WORDS.contains(word)) {
                result.add(word);
            }
        }
        return result;
    }

    private int overlap(String value, Set<String> queryWords) {
        String normalized = value.toLowerCase(Locale.ROOT);
        return (int) queryWords.stream().filter(normalized::contains).count();
    }

    private String decodeRawData(String rawData) {
        if (rawData.stripLeading().startsWith("<")) {
            return rawData;
        }
        try {
            return new String(
                    Base64.getDecoder().decode(rawData),
                    StandardCharsets.UTF_8
            );
        } catch (IllegalArgumentException exception) {
            throw new WebSearchUnavailableException(
                    "Не удалось декодировать результаты Yandex Search API",
                    exception
            );
        }
    }

    private URI safePublicUri(String value) throws IOException {
        URI uri = URI.create(value);
        if (!"http".equalsIgnoreCase(uri.getScheme())
                && !"https".equalsIgnoreCase(uri.getScheme())) {
            throw new IOException("Unsupported URL scheme");
        }
        if (uri.getHost() == null || uri.getHost().isBlank()) {
            throw new IOException("URL has no host");
        }
        for (InetAddress address : InetAddress.getAllByName(uri.getHost())) {
            if (address.isAnyLocalAddress()
                    || address.isLoopbackAddress()
                    || address.isLinkLocalAddress()
                    || address.isSiteLocalAddress()) {
                throw new IOException("Private URL is not allowed");
            }
        }
        return uri;
    }

    private HttpClient httpClient(AppProperties.WebSearch config) {
        return HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(config.getRequestTimeoutSeconds()))
                .followRedirects(HttpClient.Redirect.NEVER)
                .build();
    }

    private AppProperties.WebSearch config() {
        AppProperties.WebSearch config = properties.getWebSearch();
        if (!config.isEnabled()) {
            throw new WebSearchUnavailableException(
                    "Поиск в открытых источниках отключён"
            );
        }
        if (config.getBaseUrl() == null
                || config.getBaseUrl().isBlank()
                || config.getApiKey() == null
                || config.getApiKey().isBlank()
                || config.getFolderId() == null
                || config.getFolderId().isBlank()) {
            throw new WebSearchUnavailableException(
                    "Поиск в открытых источниках не настроен"
            );
        }
        return config;
    }

    private String text(Element parent, String selector) {
        Element element = parent.selectFirst(selector);
        return element == null ? null : element.text().strip();
    }

    private String firstContent(Document document, String... selectors) {
        for (String selector : selectors) {
            Element element = document.selectFirst(selector);
            if (element == null) {
                continue;
            }
            String value = firstNonBlank(
                    element.attr("content"),
                    element.attr("datetime"),
                    element.text()
            );
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.strip();
            }
        }
        return null;
    }

    private String normalizeText(String value) {
        return value == null ? "" : value.replaceAll("\\s+", " ").strip();
    }

    private String truncate(String value, int maxCharacters) {
        if (value.length() <= maxCharacters) {
            return value;
        }
        return value.substring(0, Math.max(0, maxCharacters - 3)).stripTrailing() + "...";
    }

    public record SearchLink(
            String url,
            String title,
            String publishedAt,
            String snippet
    ) {
    }

    public static class WebSearchUnavailableException extends RuntimeException {
        public WebSearchUnavailableException(String message) {
            super(message);
        }

        public WebSearchUnavailableException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
