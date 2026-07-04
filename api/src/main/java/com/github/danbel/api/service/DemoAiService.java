package com.github.danbel.api.service;

import com.github.danbel.api.client.dto.GraphRagContextDto;
import com.github.danbel.api.client.dto.GraphRagMatchedEntityDto;
import com.github.danbel.api.client.dto.GraphRagPathDto;
import com.github.danbel.api.client.dto.GraphRagRetrieveResponseDto;
import com.github.danbel.api.config.AppProperties;
import com.github.danbel.api.dto.chat.ChatCitationDto;
import com.github.danbel.api.dto.chat.ChatCitationEntityDto;
import com.github.danbel.api.dto.chat.WebSearchSourceDto;
import com.github.danbel.api.dto.common.ModelTokenUsageDto;
import com.github.danbel.api.model.entity.DocumentEntity;
import com.github.danbel.api.model.enums.MentionableEntityType;
import com.github.danbel.api.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.metadata.ChatResponseMetadata;
import org.springframework.ai.chat.metadata.DefaultUsage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class DemoAiService {

    private static final String VISUAL_ID = "visual-dispersion-map-after";
    private static final Pattern STREAM_PART = Pattern.compile("\\S+\\s*|\\s+");

    private final AppProperties properties;
    private final DocumentRepository documentRepository;

    public boolean enabled() {
        return properties.getDemo().isEnabled();
    }

    public GraphRagRetrieveResponseDto retrieval(String query) {
        if (shouldUseMdpi(query)) {
            return mdpiRetrieval();
        }
        DocumentEntity document = demoDocument(false);
        String documentId = document == null ? "demo-document" : document.getId();
        String title = document == null ? "13 Приложение. Статья" : document.getTitle();

        List<ChatCitationEntityDto> related = List.of(
                new ChatCitationEntityDto("technology-rutrol-ad-171",
                        MentionableEntityType.TECHNOLOGY, "Rutrol AD 171",
                        "Закрепляющий реагент для пылящей поверхности"),
                new ChatCitationEntityDto("experiment-dispersion-2908",
                        MentionableEntityType.EXPERIMENT, "Расчёт рассеивания вещества 2908",
                        "Моделирование до и после мероприятий"),
                new ChatCitationEntityDto("facility-tailings-1",
                        MentionableEntityType.FACILITY, "Хвостохранилище № 1",
                        "Промышленный объект исследования")
        );
        List<GraphRagPathDto> paths = List.of(
                new GraphRagPathDto("process-dust-suppression",
                        "Пылеподавление на хвостохранилищах",
                        MentionableEntityType.PROCESS, "USES",
                        "technology-rutrol-ad-171", "Rutrol AD 171",
                        MentionableEntityType.TECHNOLOGY),
                new GraphRagPathDto("experiment-dispersion-2908",
                        "Расчёт рассеивания вещества 2908",
                        MentionableEntityType.EXPERIMENT, "MEASURES",
                        "property-concentration", "Концентрация пыли в жилой зоне",
                        MentionableEntityType.PROPERTY)
        );
        String tableQuote = "После применения мероприятий концентрация пыли в жилой зоне "
                + "снизилась с 0,45 до 0,05 ПДК. Валовые выбросы: хвостохранилище № 1 "
                + "— с 275,4 до 27,54 т/год; «Лебяжье» — с 275,963 до 27,596 т/год.";
        String figureQuote = "Рисунок 5. Карта расчета рассеивания по веществу 2908 "
                + "после применения мероприятий по пылеподавлению.";
        String fieldExperimentQuote = "Наилучшие результаты были получены при расходах "
                + "реагента Rutrol AD 171 в 30–40 г/м² с рабочей концентрацией 3 %.";
        String laboratoryQuote = "Таблица 3: при расходе 30 г/м² эффективность составила "
                + "99,09 %, при расходе 40 г/м² — 99,66 %.";

        List<ChatCitationDto> citations = List.of(
                new ChatCitationDto("citation-results", documentId,
                        MentionableEntityType.DOCUMENT, title,
                        tableQuote, 10, related, "document", null, null,
                        tableQuote, null, null),
                new ChatCitationDto("citation-figure-5", documentId,
                        MentionableEntityType.DOCUMENT, title,
                        figureQuote, 11, related, "document", null, null,
                        figureQuote, VISUAL_ID, "image"),
                new ChatCitationDto("citation-field", documentId,
                        MentionableEntityType.DOCUMENT, title,
                        fieldExperimentQuote, 6, related, "document", null, null,
                        fieldExperimentQuote, null, null),
                new ChatCitationDto("citation-lab", documentId,
                        MentionableEntityType.DOCUMENT, title,
                        laboratoryQuote, 10, related, "document", null, null,
                        laboratoryQuote, null, null)
        );
        List<GraphRagMatchedEntityDto> entities = List.of(
                entity("technology-rutrol-ad-171", MentionableEntityType.TECHNOLOGY,
                        "Rutrol AD 171", "Закрепляющий реагент"),
                entity("material-dust-2908", MentionableEntityType.MATERIAL,
                        "Неорганическая пыль 2908", "Исследуемое вещество"),
                entity("experiment-dispersion-2908", MentionableEntityType.EXPERIMENT,
                        "Расчёт рассеивания вещества 2908", "Моделирование рассеивания"),
                entity("process-dust-suppression", MentionableEntityType.PROCESS,
                        "Пылеподавление на хвостохранилищах", "Исследуемый процесс"),
                entity("property-concentration", MentionableEntityType.PROPERTY,
                        "Концентрация пыли в жилой зоне", "0,45 → 0,05 ПДК"),
                entity("facility-tailings-1", MentionableEntityType.FACILITY,
                        "Хвостохранилище № 1", "Объект исследования")
        );
        List<GraphRagContextDto> contexts = List.of(
                new GraphRagContextDto("demo-page-10", tableQuote, documentId,
                        title, 10, "Результаты и обсуждение", 0.982,
                        entities.stream().map(GraphRagMatchedEntityDto::id).toList(),
                        paths, "vector+graph"),
                new GraphRagContextDto("demo-page-11", figureQuote, documentId,
                        title, 11, "Рисунок 5", 0.974,
                        List.of("experiment-dispersion-2908", "property-concentration"),
                        paths, "visual+graph"),
                new GraphRagContextDto("demo-page-6", fieldExperimentQuote, documentId,
                        title, 6, "Полевые испытания", 0.951,
                        List.of("technology-rutrol-ad-171"), paths, "vector+graph"),
                new GraphRagContextDto("demo-page-10-lab", laboratoryQuote, documentId,
                        title, 10, "Таблица 3. Результаты лабораторных испытаний", 0.947,
                        List.of("technology-rutrol-ad-171"), paths, "vector+graph")
        );
        return new GraphRagRetrieveResponseDto(
                "available",
                "Hybrid GraphRAG нашёл 4 релевантных фрагмента, 6 сущностей и 2 пути графа.",
                citations, 4, 2,
                contexts.stream().map(GraphRagContextDto::text).toList(),
                contexts, entities, paths, List.of(),
                List.of(new ModelTokenUsageDto(
                        "text-embeddings-v2-query", 86, 0, 86))
        );
    }

    public String answer(ChatPromptPlan prompt) {
        String query = prompt.userPrompt().toLowerCase(Locale.ROOT);
        if ("open_sources".equals(prompt.evidence().searchMode())) {
            return """
                    Исследования показывают, что эффективность пылеподавления зависит не только от реагента, \
                    но и от свойств поверхности, ветровой нагрузки и устойчивости закрепляющего слоя [[1,2]].

                    Для промышленного внедрения важно проверить долговечность покрытия при осадках и сильном \
                    ветре, а также сопоставить лабораторные результаты с полномасштабными испытаниями [[1]].
                    """;
        }
        if (isMdpiPrompt(prompt)) {
            if (query.contains("огранич") || query.contains("надеж")
                    || query.contains("достовер")) {
                return """
                        Авторы выделяют несколько ограничений метаанализа: для части показателей \
                        доступно мало исследований, большинство работ выполнено в странах Азии, \
                        а для ряда результатов сохраняется сильная или умеренная статистическая \
                        неоднородность [[3]].

                        Кроме того, перенос выводов на людей пока требует дополнительных \
                        доклинических и клинических исследований [[3]].
                        """;
            }
            if (query.contains("сколько") || query.contains("набор")) {
                return """
                        В количественный анализ содержания mtDNA вошли **19 исследований in vitro** \
                        и **69 наборов данных** [[1]]. Объединённая оценка показала значимое снижение \
                        содержания mtDNA: SMD = −1,08 при p = 0,001 [[1]].
                        """;
            }
            if (query.contains("ген") || query.contains("биоген")
                    || query.contains("слияни") || query.contains("делени")) {
                return """
                        После воздействия наночастиц снижалась экспрессия mtDNA-кодируемых генов \
                        **ND1, COX1, COX2, CYTB и ATP6** [[2]].

                        Гены биогенеза **SIRT1, PGC-1α и TFAM**, а также гены слияния \
                        **MFN1, MFN2 и OPA1** были подавлены. Напротив, гены деления \
                        **DRP1 и FIS1** демонстрировали повышение экспрессии [[2]].
                        """;
            }
            return """
                    Метаанализ показал, что воздействие наночастиц связано со значимым \
                    снижением содержания митохондриальной ДНК: SMD = −1,08, p = 0,001 [[1]]. \
                    Одновременно изменялась экспрессия генов, отвечающих за кодирование mtDNA, \
                    митохондриальный биогенез, слияние и деление митохондрий [[2]].

                    Авторы рассматривают истощение mtDNA и нарушение путей её поддержания как \
                    возможный механизм токсического действия наночастиц, но подчёркивают \
                    неоднородность исследований и необходимость дальнейшей валидации [[3]].
                    """;
        }
        if (query.contains("карт") || query.contains("рисунок 5")
                || query.contains("покажи")) {
            return """
                    После применения пылеподавления расчётная концентрация вещества 2908 в жилой зоне \
                    снизилась с **0,45 до 0,05 ПДК** [[1]]. На рисунке 5 показана карта рассеивания \
                    после проведения мероприятий [[2]].

                    [[visual:visual-dispersion-map-after]]
                    """;
        }
        return """
                В исследовании рассматривались орошение водой и закрепление пылящей поверхности реагентом. \
                Наиболее эффективным оказался **Rutrol AD 171**. В полевых испытаниях лучшие результаты \
                получены при рабочей концентрации 3 % и расходе 30–40 г/м² [[3]]. В лабораторном опыте \
                эффективность при расходе 30 г/м² составила 99,09 %, а при 40 г/м² — 99,66 % [[4]].

                Для расчёта промышленного эффекта использовали консервативную эффективность 90 %. \
                После мероприятий концентрация пыли в жилой зоне снизилась с **0,45 до 0,05 ПДК**, \
                а выброс хвостохранилища № 1 — с **275,4 до 27,54 т/год** [[1]].

                Результат подтверждается картой рассеивания вещества 2908 после применения \
                мероприятий [[2]].

                [[visual:visual-dispersion-map-after]]

                **Ограничение:** авторы рекомендуют провести полномасштабные промышленные испытания, \
                поскольку долговременная устойчивость покрытия при сильном ветре и осадках требует проверки.
                """;
    }

    public ChatGenerationResult result(ChatPromptPlan prompt) {
        String answer = answer(prompt);
        return new ChatGenerationResult(answer, "YandexGPT 5.1",
                2140, 356, 2600, prompt.evidence());
    }

    public Flux<ChatResponse> stream(ChatPromptPlan prompt) {
        String answer = answer(prompt);
        List<String> parts = new ArrayList<>();
        Matcher matcher = STREAM_PART.matcher(answer);
        while (matcher.find()) {
            parts.add(matcher.group());
        }
        return Flux.fromIterable(parts)
                .index()
                .delayElements(Duration.ofMillis(
                        Math.max(1, properties.getDemo().getChatChunkDelayMs())))
                .map(indexed -> {
                    boolean last = indexed.getT1() == parts.size() - 1L;
                    var metadataBuilder = ChatResponseMetadata.builder()
                            .model("YandexGPT 5.1");
                    if (last) {
                        metadataBuilder.usage(new DefaultUsage(2140, 356, 2496));
                    }
                    ChatResponseMetadata metadata = metadataBuilder.build();
                    return new ChatResponse(
                            List.of(new Generation(new AssistantMessage(indexed.getT2()))),
                            metadata
                    );
                });
    }

    public List<WebSearchSourceDto> webSources() {
        pause(properties.getDemo().getWebSearchDelayMs());
        return List.of(
                new WebSearchSourceDto("demo-web-1",
                        "Dust suppression at coal mines: current methods and challenges",
                        "https://doi.org/10.1080/10962247.2021.1979123",
                        "2021",
                        "Эффективность закрепляющих реагентов зависит от условий эксплуатации.",
                        "Обзор методов подавления пыли и факторов, влияющих на устойчивость покрытия."),
                new WebSearchSourceDto("demo-web-2",
                        "Environmental risk of windblown tailings",
                        "https://doi.org/10.1016/j.envpol.2018.05.084",
                        "2018",
                        "Ветровой перенос хвостов требует оценки риска и контроля источника.",
                        "Исследование переноса частиц хвостохранилищ и экологических рисков.")
        );
    }

    private GraphRagRetrieveResponseDto mdpiRetrieval() {
        DocumentEntity document = demoDocument(true);
        String documentId = document == null ? "demo-mdpi-document" : document.getId();
        String title = document == null
                ? "Toxicity Evaluation of Nano-Sized Particles"
                : document.getTitle();
        String sourceUrl = "https://www.mdpi.com/2076-3921/15/7/848";
        List<ChatCitationEntityDto> related = List.of(
                new ChatCitationEntityDto(
                        "material-nano-sized-particles",
                        MentionableEntityType.MATERIAL,
                        "Nano-sized particles",
                        "Наночастицы размером 1–100 нм"
                ),
                new ChatCitationEntityDto(
                        "property-mtdna-content",
                        MentionableEntityType.PROPERTY,
                        "mtDNA content",
                        "Содержание митохондриальной ДНК"
                ),
                new ChatCitationEntityDto(
                        "issue-meta-analysis-heterogeneity",
                        MentionableEntityType.DATA_ISSUE,
                        "Статистическая неоднородность",
                        "Для части показателей сохраняется гетерогенность"
                )
        );
        String abstractQuote = "Meta-analysis of 19 in vitro studies (69 datasets) "
                + "showed exposure to nano-sized particles significantly reduced "
                + "mtDNA content (standardized mean difference = −1.08; p = 0.001).";
        String genesQuote = "ND1, COX1, COX2, CYTB and ATP6 were down-regulated; "
                + "SIRT1, PGC-1α, TFAM, MFN1, MFN2 and OPA1 were down-regulated, "
                + "while DRP1 and FIS1 were up-regulated.";
        String limitationsQuote = "The findings should be interpreted with caution "
                + "because of strong or moderate heterogeneity, small numbers of "
                + "studies for some variables and the need for additional clinical research.";
        List<ChatCitationDto> citations = List.of(
                new ChatCitationDto(
                        "citation-mdpi-abstract", documentId,
                        MentionableEntityType.DOCUMENT, title,
                        abstractQuote, 1, related, "document", sourceUrl,
                        "2026-07-04", abstractQuote, null, null
                ),
                new ChatCitationDto(
                        "citation-mdpi-genes", documentId,
                        MentionableEntityType.DOCUMENT, title,
                        genesQuote, 1, related, "document", sourceUrl,
                        "2026-07-04", genesQuote, null, null
                ),
                new ChatCitationDto(
                        "citation-mdpi-limitations", documentId,
                        MentionableEntityType.DOCUMENT, title,
                        limitationsQuote, 16, related, "document", sourceUrl,
                        "2026-07-04", limitationsQuote, null, null
                )
        );
        List<GraphRagMatchedEntityDto> entities = List.of(
                entity("material-nano-sized-particles", MentionableEntityType.MATERIAL,
                        "Nano-sized particles", "Частицы размером 1–100 нм"),
                entity("experiment-meta-analysis-in-vitro", MentionableEntityType.EXPERIMENT,
                        "Meta-analysis of in vitro studies", "19 исследований, 69 наборов данных"),
                entity("property-mtdna-content", MentionableEntityType.PROPERTY,
                        "mtDNA content", "SMD = −1,08; p = 0,001"),
                entity("property-mitochondrial-biogenesis", MentionableEntityType.PROPERTY,
                        "Mitochondrial biogenesis genes", "SIRT1, PGC-1α и TFAM"),
                entity("issue-meta-analysis-heterogeneity", MentionableEntityType.DATA_ISSUE,
                        "Статистическая неоднородность", "Ограничение метаанализа")
        );
        List<GraphRagPathDto> paths = List.of(
                new GraphRagPathDto(
                        "experiment-meta-analysis-in-vitro",
                        "Meta-analysis of in vitro studies",
                        MentionableEntityType.EXPERIMENT,
                        "USES_MATERIAL",
                        "material-nano-sized-particles",
                        "Nano-sized particles",
                        MentionableEntityType.MATERIAL
                ),
                new GraphRagPathDto(
                        "experiment-meta-analysis-in-vitro",
                        "Meta-analysis of in vitro studies",
                        MentionableEntityType.EXPERIMENT,
                        "MEASURES",
                        "property-mtdna-content",
                        "mtDNA content",
                        MentionableEntityType.PROPERTY
                )
        );
        List<GraphRagContextDto> contexts = List.of(
                new GraphRagContextDto(
                        "mdpi-abstract", abstractQuote, documentId, title,
                        1, "Abstract", 0.991,
                        List.of("experiment-meta-analysis-in-vitro", "property-mtdna-content"),
                        paths, "vector+graph"
                ),
                new GraphRagContextDto(
                        "mdpi-genes", genesQuote, documentId, title,
                        1, "Conclusions", 0.978,
                        List.of("property-mitochondrial-biogenesis"), paths,
                        "vector+graph"
                ),
                new GraphRagContextDto(
                        "mdpi-limitations", limitationsQuote, documentId, title,
                        16, "Limitations", 0.952,
                        List.of("issue-meta-analysis-heterogeneity"), paths,
                        "vector+graph"
                )
        );
        return new GraphRagRetrieveResponseDto(
                "available",
                "Hybrid GraphRAG нашёл 3 фрагмента, 5 сущностей и 2 пути графа.",
                citations, 3, 1,
                contexts.stream().map(GraphRagContextDto::text).toList(),
                contexts, entities, paths, List.of(),
                List.of(new ModelTokenUsageDto(
                        "text-embeddings-v2-query", 74, 0, 74))
        );
    }

    private boolean shouldUseMdpi(String query) {
        String normalized = query == null ? "" : query.toLowerCase(Locale.ROOT);
        if (normalized.matches(".*(пылеподав|rutrol|хвостохранилищ|веществ.? 2908).*")) {
            return false;
        }
        if (normalized.matches(".*(mtdna|митохонд|наночаст|метаанализ|биогенез|"
                + "drp1|fis1|pgc-1|tfam).*")) {
            return true;
        }
        DocumentEntity latest = documentRepository.findAllByOrderByIndexedAtDesc()
                .stream().findFirst().orElse(null);
        return latest != null
                && latest.getSourceUrl() != null
                && latest.getSourceUrl().contains("mdpi.com/2076-3921/15/7/848");
    }

    private boolean isMdpiPrompt(ChatPromptPlan prompt) {
        return shouldUseMdpi(prompt.userPrompt())
                || prompt.evidence().entities().stream()
                .anyMatch(entity -> entity.id().contains("mtdna")
                        || entity.id().contains("nano-sized"));
    }

    private DocumentEntity demoDocument(boolean mdpi) {
        return documentRepository.findAllByOrderByIndexedAtDesc().stream()
                .filter(document -> mdpi
                        ? document.getSourceUrl() != null
                        && document.getSourceUrl().contains(
                                "mdpi.com/2076-3921/15/7/848"
                        )
                        : document.getTitle().toLowerCase(Locale.ROOT)
                        .contains("13 приложение"))
                .findFirst()
                .orElseGet(() -> documentRepository.findAllByOrderByIndexedAtDesc()
                        .stream().findFirst().orElse(null));
    }

    private GraphRagMatchedEntityDto entity(
            String id, MentionableEntityType type, String label, String description
    ) {
        return new GraphRagMatchedEntityDto(
                id, type, label, description, 0.96, "REVIEWED", null, 2024
        );
    }

    private void pause(long milliseconds) {
        try {
            Thread.sleep(Math.max(0, milliseconds));
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
        }
    }
}
