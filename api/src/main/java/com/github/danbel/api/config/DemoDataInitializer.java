package com.github.danbel.api.config;

import com.github.danbel.api.dto.chat.ChatCitationDto;
import com.github.danbel.api.dto.common.EntityAttributeDto;
import com.github.danbel.api.dto.common.SourceReferenceDto;
import com.github.danbel.api.dto.issue.RelatedEntityLinkDto;
import com.github.danbel.api.dto.material.MaterialCompositionItemDto;
import com.github.danbel.api.dto.material.MaterialKeyPropertyDto;
import com.github.danbel.api.mapper.JsonPayloadMapper;
import com.github.danbel.api.model.entity.ChatEntity;
import com.github.danbel.api.model.entity.ChatMessageEntity;
import com.github.danbel.api.model.entity.DataIssueEntity;
import com.github.danbel.api.model.entity.DocumentEntity;
import com.github.danbel.api.model.entity.ExperimentEntity;
import com.github.danbel.api.model.entity.KnowledgeConnectionEntity;
import com.github.danbel.api.model.entity.KnowledgeEntityRecord;
import com.github.danbel.api.model.entity.MaterialEntity;
import com.github.danbel.api.model.enums.ChatHistoryGroup;
import com.github.danbel.api.model.enums.ChatMessageRole;
import com.github.danbel.api.model.enums.DataIssueSeverity;
import com.github.danbel.api.model.enums.DataIssueType;
import com.github.danbel.api.model.enums.DocumentStatus;
import com.github.danbel.api.model.enums.DocumentType;
import com.github.danbel.api.model.enums.MentionableEntityType;
import com.github.danbel.api.repository.ChatRepository;
import com.github.danbel.api.repository.DataIssueRepository;
import com.github.danbel.api.repository.DocumentRepository;
import com.github.danbel.api.repository.ExperimentRepository;
import com.github.danbel.api.repository.KnowledgeConnectionRepository;
import com.github.danbel.api.repository.KnowledgeEntityRepository;
import com.github.danbel.api.repository.MaterialRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
public class DemoDataInitializer implements ApplicationRunner {

    private final DocumentRepository documentRepository;
    private final ExperimentRepository experimentRepository;
    private final MaterialRepository materialRepository;
    private final DataIssueRepository dataIssueRepository;
    private final KnowledgeEntityRepository knowledgeEntityRepository;
    private final KnowledgeConnectionRepository knowledgeConnectionRepository;
    private final ChatRepository chatRepository;
    private final JsonPayloadMapper json;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (documentRepository.count() > 0) {
            return;
        }

        seedDocuments();
        seedMaterials();
        seedExperiments();
        seedIssues();
        seedGraph();
        seedChats();
    }

    private void seedDocuments() {
        OffsetDateTime now = OffsetDateTime.now();
        documentRepository.saveAll(List.of(
                document("doc-t-2025-17", "Отчет T-2025-17", DocumentType.PDF, 2025, "Лаборатория термообработки", "Серия испытаний сплава X при 850 °C.", 42, now.minusDays(1), List.of("EXP-0142"), List.of("material-x"), List.of("issue-unit-mismatch")),
                document("doc-thermal-article", "Статья по повторной термообработке", DocumentType.PDF, 2025, "Иванов А. В.", "Повторная серия экспериментов для проверки воспроизводимости.", 18, now.minusDays(2), List.of("EXP-0208"), List.of("material-x"), List.of()),
                document("doc-experiment-catalog-2024", "Каталог экспериментов 2024", DocumentType.XLSX, 2024, "Центр материаловедения", "Сводный каталог экспериментов по сплавам X, Y и Z.", null, now.minusDays(3), List.of("EXP-0094"), List.of("material-y"), List.of("issue-missing-regime")),
                document("doc-z19", "Протокол Z-19", DocumentType.PDF, 2025, "Лаборатория механических испытаний", "Закалка сплава Z в воде.", 15, now.minusDays(4), List.of("EXP-0241"), List.of("material-z"), List.of())
        ));
    }

    private DocumentEntity document(String id, String title, DocumentType type, int year, String author, String description, Integer pages, OffsetDateTime indexedAt, List<String> experimentIds, List<String> materialIds, List<String> issueIds) {
        return DocumentEntity.builder()
                .id(id)
                .title(title)
                .type(type)
                .year(year)
                .author(author)
                .description(description)
                .pages(pages)
                .status(DocumentStatus.READY)
                .indexedAt(indexedAt)
                .extractedEntities(experimentIds.size() + materialIds.size())
                .experimentIdsJson(json.write(experimentIds))
                .materialIdsJson(json.write(materialIds))
                .issueIdsJson(json.write(issueIds))
                .build();
    }

    private void seedMaterials() {
        materialRepository.saveAll(List.of(
                material("material-x", "Сплав X", "Никелевый жаропрочный сплав", "Исследуемый сплав с повышенным содержанием никеля и хрома.", List.of("X alloy"), List.of(new MaterialCompositionItemDto("Ni", "61.4 %"), new MaterialCompositionItemDto("Cr", "18.2 %")), List.of(new MaterialKeyPropertyDto("Прочность после обработки", "485 МПа")), List.of("EXP-0142", "EXP-0208"), List.of("doc-t-2025-17", "doc-thermal-article"), List.of("issue-unit-mismatch")),
                material("material-y", "Сплав Y", "Никель-кобальтовый сплав", "Материал для длительной эксплуатации под нагрузкой.", List.of(), List.of(new MaterialCompositionItemDto("Ni", "49.0 %"), new MaterialCompositionItemDto("Co", "17.5 %")), List.of(new MaterialKeyPropertyDto("Твердость", "37 HRC")), List.of("EXP-0094"), List.of("doc-experiment-catalog-2024"), List.of("issue-missing-regime")),
                material("material-z", "Сплав Z", "Железоникелевый сплав", "Материал для сравнения способов охлаждения.", List.of(), List.of(new MaterialCompositionItemDto("Fe", "52.0 %"), new MaterialCompositionItemDto("Ni", "32.0 %")), List.of(new MaterialKeyPropertyDto("Эффект закалки", "+22 HRC")), List.of("EXP-0241"), List.of("doc-z19"), List.of())
        ));
    }

    private MaterialEntity material(String id, String name, String category, String description, List<String> aliases, List<MaterialCompositionItemDto> composition, List<MaterialKeyPropertyDto> keyProperties, List<String> experimentIds, List<String> documentIds, List<String> issueIds) {
        return MaterialEntity.builder()
                .id(id)
                .name(name)
                .category(category)
                .description(description)
                .aliasesJson(json.write(aliases))
                .compositionJson(json.write(composition))
                .keyPropertiesJson(json.write(keyProperties))
                .experimentIdsJson(json.write(experimentIds))
                .documentIdsJson(json.write(documentIds))
                .issueIdsJson(json.write(issueIds))
                .build();
    }

    private void seedExperiments() {
        experimentRepository.saveAll(List.of(
                experiment("EXP-0142", "Эксперимент 142", "material-x", "Сплав X", 850, "2 ч", "Воздух", "Предел прочности", "420 МПа", "485 МПа", "+15 %", "equipment-vn12", "Печь ВН-12", "team-thermal", "Лаборатория термообработки", LocalDate.of(2025, 3, 14), "doc-t-2025-17", "Отчет T-2025-17", 18, "Основная серия при 850 °C."),
                experiment("EXP-0208", "Повторная серия 208", "material-x", "Сплав X", 850, "2 ч", "Воздух", "Предел прочности", "430 МПа", "492 МПа", "+14 %", "equipment-vn12", "Печь ВН-12", "team-thermal", "Лаборатория термообработки", LocalDate.of(2025, 9, 2), "doc-thermal-article", "Статья по повторной термообработке", 7, "Проверка воспроизводимости на другой партии."),
                experiment("EXP-0094", "Старение сплава Y", "material-y", "Сплав Y", 760, "6 ч", "Печь", "Твердость", "31 HRC", "38 HRC", "+7 HRC", null, "Не указано", "team-materials", "Центр материаловедения", LocalDate.of(2024, 11, 5), "doc-experiment-catalog-2024", "Каталог экспериментов 2024", null, "В каталоге не указан полный режим охлаждения."),
                experiment("EXP-0241", "Закалка сплава Z в воде", "material-z", "Сплав Z", 900, "1 ч", "Вода", "Твердость", "24 HRC", "46 HRC", "+22 HRC", null, "Не указано", "team-mechanics", "Лаборатория механических испытаний", LocalDate.of(2025, 5, 19), "doc-z19", "Протокол Z-19", 9, "Серия для сравнения охлаждающих сред.")
        ));
    }

    private ExperimentEntity experiment(String id, String title, String materialId, String material, Integer temperature, String duration, String coolingMethod, String property, String valueBefore, String valueAfter, String effect, String equipmentId, String equipment, String teamId, String team, LocalDate date, String sourceDocumentId, String sourceName, Integer sourcePage, String notes) {
        return ExperimentEntity.builder()
                .id(id)
                .title(title)
                .materialId(materialId)
                .material(material)
                .materialDetails("Карточка материала: " + material)
                .temperature(temperature)
                .duration(duration)
                .coolingMethod(coolingMethod)
                .property(property)
                .valueBefore(valueBefore)
                .valueAfter(valueAfter)
                .effect(effect)
                .equipmentId(equipmentId)
                .equipment(equipment)
                .teamId(teamId)
                .team(team)
                .date(date)
                .sourceDocumentId(sourceDocumentId)
                .sourceName(sourceName)
                .sourcePage(sourcePage)
                .confidence(0.92)
                .notes(notes)
                .build();
    }

    private void seedIssues() {
        OffsetDateTime now = OffsetDateTime.now();
        dataIssueRepository.saveAll(List.of(
                issue("issue-unit-mismatch", DataIssueType.UNIT_MISMATCH, DataIssueSeverity.MEDIUM, "Несопоставимые единицы твердости", "В связанных источниках встречаются HRC и HV без правила пересчета.", "Добавить стандарт пересчета или пометить измерения как несопоставимые.", now.minusHours(5), List.of(new RelatedEntityLinkDto("material-x", "Сплав X", MentionableEntityType.MATERIAL), new RelatedEntityLinkDto("doc-t-2025-17", "Отчет T-2025-17", MentionableEntityType.DOCUMENT))),
                issue("issue-missing-regime", DataIssueType.MISSING_DATA, DataIssueSeverity.HIGH, "Не указан режим охлаждения", "Для части экспериментов сплава Y отсутствует охлаждающая среда.", "Проверить исходный каталог или запросить лабораторный журнал.", now.minusDays(1), List.of(new RelatedEntityLinkDto("EXP-0094", "EXP-0094", MentionableEntityType.EXPERIMENT))),
                issue("issue-conflict-strength", DataIssueType.CONFLICT, DataIssueSeverity.LOW, "Расхождение эффекта на прочность", "Две серии для сплава X дают близкий, но не идентичный прирост прочности.", "Сравнить партии материала и калибровку оборудования.", now.minusDays(2), List.of(new RelatedEntityLinkDto("EXP-0142", "EXP-0142", MentionableEntityType.EXPERIMENT), new RelatedEntityLinkDto("EXP-0208", "EXP-0208", MentionableEntityType.EXPERIMENT)))
        ));
    }

    private DataIssueEntity issue(String id, DataIssueType type, DataIssueSeverity severity, String title, String description, String recommendation, OffsetDateTime detectedAt, List<RelatedEntityLinkDto> relatedEntities) {
        return DataIssueEntity.builder()
                .id(id)
                .type(type)
                .severity(severity)
                .title(title)
                .description(description)
                .recommendation(recommendation)
                .detectedAt(detectedAt)
                .relatedEntitiesJson(json.write(relatedEntities))
                .build();
    }

    private void seedGraph() {
        knowledgeEntityRepository.saveAll(List.of(
                graphEntity("material-x", MentionableEntityType.MATERIAL, "Сплав X", "Никелевый жаропрочный сплав", "Исследуемый сплав с повышенным содержанием никеля и хрома.", 460, 280, List.of(new EntityAttributeDto("Ni", 61.4, "%"), new EntityAttributeDto("Cr", 18.2, "%")), List.of(new SourceReferenceDto("doc-t-2025-17", 4))),
                graphEntity("EXP-0142", MentionableEntityType.EXPERIMENT, "Эксперимент 142", "Термообработка образца", "Исследование влияния выдержки при высокой температуре на прочность.", 130, 110, List.of(new EntityAttributeDto("Дата", "14.03.2025", null)), List.of(new SourceReferenceDto("doc-t-2025-17", 18))),
                graphEntity("regime-850", MentionableEntityType.REGIME, "850 °C · 2 часа", "Режим термообработки", "Нагрев до 850 °C, выдержка 2 часа, охлаждение на воздухе.", 155, 330, List.of(new EntityAttributeDto("Температура", 850, "°C"), new EntityAttributeDto("Выдержка", 2, "ч")), List.of(new SourceReferenceDto("doc-t-2025-17", 17))),
                graphEntity("property-strength", MentionableEntityType.PROPERTY, "Предел прочности", "+15 % после обработки", "Максимальное напряжение до разрушения образца.", 770, 355, List.of(new EntityAttributeDto("До обработки", 420, "МПа"), new EntityAttributeDto("После обработки", 485, "МПа")), List.of(new SourceReferenceDto("doc-t-2025-17", 18))),
                graphEntity("equipment-vn12", MentionableEntityType.EQUIPMENT, "Печь ВН-12", "Вакуумная установка", "Оборудование для высокотемпературной обработки.", 450, 40, List.of(new EntityAttributeDto("Тип", "Вакуумная печь", null)), List.of(new SourceReferenceDto("doc-t-2025-17", 16))),
                graphEntity("team-thermal", MentionableEntityType.TEAM, "Лаборатория термообработки", "Исследовательская команда", "Команда, проводившая серию экспериментов.", 760, 90, List.of(), List.of(new SourceReferenceDto("doc-t-2025-17", 2))),
                graphEntity("doc-t-2025-17", MentionableEntityType.DOCUMENT, "Отчет T-2025-17", "Исходный документ", "Технический отчет по экспериментальной серии.", 1030, 260, List.of(new EntityAttributeDto("Год", 2025, null)), List.of(new SourceReferenceDto("doc-t-2025-17", null))),
                graphEntity("issue-unit-mismatch", MentionableEntityType.DATA_ISSUE, "Несопоставимые единицы твердости", "Проблема в данных", "Единицы HRC и HV используются без правила пересчета.", 1040, 480, List.of(new EntityAttributeDto("Серьезность", "medium", null)), List.of(new SourceReferenceDto("doc-t-2025-17", 18)))
        ));

        knowledgeConnectionRepository.saveAll(List.of(
                connection("edge-exp-material", "EXP-0142", "material-x", "USES_MATERIAL"),
                connection("edge-exp-regime", "EXP-0142", "regime-850", "USES_REGIME"),
                connection("edge-exp-property", "EXP-0142", "property-strength", "AFFECTS"),
                connection("edge-exp-equipment", "EXP-0142", "equipment-vn12", "USES_EQUIPMENT"),
                connection("edge-exp-team", "EXP-0142", "team-thermal", "PERFORMED_BY"),
                connection("edge-exp-doc", "EXP-0142", "doc-t-2025-17", "DESCRIBED_IN"),
                connection("edge-issue-material", "issue-unit-mismatch", "material-x", "RELATED_TO")
        ));
    }

    private KnowledgeEntityRecord graphEntity(String id, MentionableEntityType type, String title, String subtitle, String description, double x, double y, List<EntityAttributeDto> attributes, List<SourceReferenceDto> sources) {
        return KnowledgeEntityRecord.builder()
                .id(id)
                .type(type)
                .title(title)
                .subtitle(subtitle)
                .description(description)
                .positionX(x)
                .positionY(y)
                .attributesJson(json.write(attributes))
                .sourcesJson(json.write(sources))
                .build();
    }

    private KnowledgeConnectionEntity connection(String id, String source, String target, String label) {
        return KnowledgeConnectionEntity.builder()
                .id(id)
                .source(source)
                .target(target)
                .label(label)
                .build();
    }

    private void seedChats() {
        OffsetDateTime now = OffsetDateTime.now();
        ChatEntity chat = ChatEntity.builder()
                .id("heat-treatment")
                .title("Влияние термообработки на прочность")
                .group(ChatHistoryGroup.TODAY)
                .createdAt(now.minusHours(2))
                .updatedAt(now.minusHours(2))
                .build();
        chat.addMessage(message("heat-treatment-user-1", ChatMessageRole.USER, "Как термообработка влияет на прочность сплава X?", List.of(), List.of(), now.minusHours(2)));
        chat.addMessage(message("heat-treatment-assistant-1", ChatMessageRole.ASSISTANT, "Найдено несколько связанных экспериментов. В серии EXP-0142 обработка при 850 °C в течение двух часов дала прирост прочности с 420 до 485 МПа.", List.of(), List.of(new ChatCitationDto("citation-exp-142", "EXP-0142", MentionableEntityType.EXPERIMENT, "EXP-0142", "Основная серия при 850 °C", null), new ChatCitationDto("citation-doc-t17", "doc-t-2025-17", MentionableEntityType.DOCUMENT, "Отчет T-2025-17", "Исходный отчет", 18)), now.minusHours(2).plusMinutes(1)));

        ChatEntity oldChat = ChatEntity.builder()
                .id("measurement-conflicts")
                .title("Противоречия в измерениях")
                .group(ChatHistoryGroup.EARLIER)
                .createdAt(now.minusDays(3))
                .updatedAt(now.minusDays(3))
                .build();
        oldChat.addMessage(message("conflicts-user-1", ChatMessageRole.USER, "Найди противоречащие измерения твердости.", List.of(), List.of(), now.minusDays(3)));
        oldChat.addMessage(message("conflicts-assistant-1", ChatMessageRole.ASSISTANT, "Обнаружена проблема с единицами измерения: часть данных указана в HRC, часть в HV без правила пересчета.", List.of(), List.of(new ChatCitationDto("citation-issue-unit", "issue-unit-mismatch", MentionableEntityType.DATA_ISSUE, "Несопоставимые единицы твердости", "Автоматически обнаруженная проблема", null)), now.minusDays(3).plusMinutes(1)));

        chatRepository.saveAll(List.of(chat, oldChat));
    }

    private ChatMessageEntity message(String id, ChatMessageRole role, String text, List<?> mentions, List<ChatCitationDto> citations, OffsetDateTime createdAt) {
        return ChatMessageEntity.builder()
                .id(id)
                .role(role)
                .text(text)
                .mentionsJson(json.write(mentions))
                .citationsJson(json.write(citations))
                .createdAt(createdAt)
                .build();
    }
}
