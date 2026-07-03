package com.github.danbel.api.service;

import com.github.danbel.api.dto.common.EntityAttributeDto;
import com.github.danbel.api.dto.common.SourceReferenceDto;
import com.github.danbel.api.dto.document.ExtractedEntityDto;
import com.github.danbel.api.dto.document.ExtractedRelationDto;
import com.github.danbel.api.dto.document.PublishExtractionRequestDto;
import com.github.danbel.api.dto.issue.RelatedEntityLinkDto;
import com.github.danbel.api.mapper.JsonPayloadMapper;
import com.github.danbel.api.model.entity.DataIssueEntity;
import com.github.danbel.api.model.entity.DocumentEntity;
import com.github.danbel.api.model.entity.ExperimentEntity;
import com.github.danbel.api.model.entity.KnowledgeConnectionEntity;
import com.github.danbel.api.model.entity.KnowledgeEntityRecord;
import com.github.danbel.api.model.enums.DataIssueSeverity;
import com.github.danbel.api.model.enums.DataIssueType;
import com.github.danbel.api.model.enums.MentionableEntityType;
import com.github.danbel.api.repository.DataIssueRepository;
import com.github.danbel.api.repository.DocumentRepository;
import com.github.danbel.api.repository.ExperimentRepository;
import com.github.danbel.api.repository.KnowledgeConnectionRepository;
import com.github.danbel.api.repository.KnowledgeEntityRepository;
import com.github.danbel.api.repository.MaterialRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tools.jackson.core.type.TypeReference;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DataQualityService {

    private static final TypeReference<List<String>> STRING_LIST = new TypeReference<>() {
    };
    private static final TypeReference<List<SourceReferenceDto>> SOURCE_REFERENCES = new TypeReference<>() {
    };
    private static final Pattern NUMBER = Pattern.compile("-?\\d+(?:[.,]\\d+)?");
    private static final int UNEXPLORED_TEMPERATURE_GAP = 50;

    private final DataIssueRepository issueRepository;
    private final ExperimentRepository experimentRepository;
    private final MaterialRepository materialRepository;
    private final DocumentRepository documentRepository;
    private final KnowledgeEntityRepository knowledgeEntityRepository;
    private final KnowledgeConnectionRepository knowledgeConnectionRepository;
    private final GraphRagGateway graphRagGateway;
    private final JsonPayloadMapper json;

    public PublishExtractionRequestDto normalizeDataIssueIds(PublishExtractionRequestDto request) {
        List<ExtractedEntityDto> entities = safeEntities(request);
        List<ExtractedRelationDto> relations = safeRelations(request);
        Map<String, String> normalizedIds = new LinkedHashMap<>();

        entities.stream()
                .filter(entity -> entity.type() == MentionableEntityType.DATA_ISSUE)
                .forEach(entity -> {
                    DataIssueType type = inferType(entity);
                    List<String> relatedIds = relatedEntityIds(entity.id(), relations);
                    String discriminator = issueDiscriminator(entity);
                    normalizedIds.put(
                            entity.id(),
                            fingerprint(type, relatedIds, discriminator)
                    );
                });

        if (normalizedIds.isEmpty()) {
            return request;
        }

        List<ExtractedEntityDto> normalizedEntities = entities.stream()
                .map(entity -> {
                    String id = normalizedIds.get(entity.id());
                    return id == null
                            ? entity
                            : new ExtractedEntityDto(
                                    id,
                                    entity.type(),
                                    entity.name(),
                                    entity.attributes(),
                                    entity.source(),
                                    entity.confidence(),
                                    entity.verificationStatus(),
                                    entity.geography(),
                                    entity.year(),
                                    entity.language()
                            );
                })
                .toList();

        List<ExtractedRelationDto> normalizedRelations = relations.stream()
                .map(relation -> {
                    String sourceId = normalizedIds.getOrDefault(relation.sourceId(), relation.sourceId());
                    String targetId = normalizedIds.getOrDefault(relation.targetId(), relation.targetId());
                    String id = sourceId.equals(relation.sourceId()) && targetId.equals(relation.targetId())
                            ? relation.id()
                            : relationFingerprint(
                                    request.documentId(),
                                    sourceId,
                                    relation.type(),
                                    targetId
                            );
                    return new ExtractedRelationDto(
                            id,
                            sourceId,
                            relation.type(),
                            targetId,
                            relation.source()
                    );
                })
                .toList();

        return new PublishExtractionRequestDto(
                request.documentId(),
                normalizedEntities,
                normalizedRelations
        );
    }

    public void saveExplicitIssues(PublishExtractionRequestDto request) {
        Map<String, ExtractedEntityDto> entitiesById = safeEntities(request).stream()
                .collect(Collectors.toMap(
                        ExtractedEntityDto::id,
                        Function.identity(),
                        (left, right) -> left,
                        LinkedHashMap::new
                ));
        DocumentEntity document = documentRepository.findById(request.documentId()).orElse(null);

        safeEntities(request).stream()
                .filter(entity -> entity.type() == MentionableEntityType.DATA_ISSUE)
                .forEach(entity -> {
                    List<RelatedEntityLinkDto> related = relatedLinks(
                            entity.id(),
                            safeRelations(request),
                            entitiesById
                    );
                    if (document != null) {
                        related = appendRelated(
                                related,
                                new RelatedEntityLinkDto(
                                        document.getId(),
                                        document.getTitle(),
                                        MentionableEntityType.DOCUMENT
                                )
                        );
                    }
                    saveIssue(
                            entity.id(),
                            inferType(entity),
                            inferSeverity(entity),
                            entity.name(),
                            attribute(entity, "description", "описание", "context", "контекст")
                                    .orElse(entity.name()),
                            attribute(entity, "recommendation", "рекомендация")
                                    .orElse("Проверить исходный документ и связанные экспериментальные данные."),
                            related
                    );
                });
    }

    public void analyzePublishedData() {
        List<ExperimentEntity> experiments = experimentRepository.findAll();
        detectMissingData(experiments);
        detectUnitMismatches(experiments);
        detectConflicts(experiments);
        detectUnexploredRanges(experiments);
        detectKnowledgeCoverage();
    }

    private void detectKnowledgeCoverage() {
        List<KnowledgeEntityRecord> entities = knowledgeEntityRepository.findAll();
        List<KnowledgeConnectionEntity> connections = knowledgeConnectionRepository.findAll();
        entities.stream()
                .filter(entity -> Set.of(
                        MentionableEntityType.CONCLUSION,
                        MentionableEntityType.PROCESS,
                        MentionableEntityType.TECHNOLOGY
                ).contains(entity.getType()))
                .forEach(entity -> {
                    List<SourceReferenceDto> sources = json.readList(
                            entity.getSourcesJson(),
                            SOURCE_REFERENCES
                    );
                    long independentSources = sources.stream()
                            .map(SourceReferenceDto::documentId)
                            .filter(Objects::nonNull)
                            .distinct()
                            .count();
                    if (independentSources < 2) {
                        saveIssue(
                                fingerprint(
                                        DataIssueType.WEAK_EVIDENCE,
                                        List.of(entity.getId()),
                                        "sources<2"
                                ),
                                DataIssueType.WEAK_EVIDENCE,
                                DataIssueSeverity.MEDIUM,
                                "Недостаточно подтверждений: " + entity.getTitle(),
                                independentSources == 0
                                        ? "Для знания не найден подтверждающий источник."
                                        : "Знание подтверждено только одним независимым источником.",
                                "Найти независимую публикацию, эксперимент или нормативный документ.",
                                linksForKnowledgeEntity(entity, sources)
                        );
                    }
                });

        entities.stream()
                .filter(entity -> Set.of(
                        MentionableEntityType.PROCESS,
                        MentionableEntityType.TECHNOLOGY,
                        MentionableEntityType.FACILITY
                ).contains(entity.getType()))
                .filter(entity -> entity.getGeography() == null || entity.getGeography().isBlank())
                .filter(entity -> connections.stream().noneMatch(connection ->
                        entity.getId().equals(connection.getSource())
                                && "LOCATED_IN".equals(connection.getLabel())))
                .forEach(entity -> saveIssue(
                        fingerprint(
                                DataIssueType.GEOGRAPHY_GAP,
                                List.of(entity.getId()),
                                "missing-geography"
                        ),
                        DataIssueType.GEOGRAPHY_GAP,
                        DataIssueSeverity.LOW,
                        "Не указана география: " + entity.getTitle(),
                        "Нельзя определить, относится знание к российской или зарубежной практике.",
                        "Уточнить страну или регион в исходном документе.",
                        linksForKnowledgeEntity(
                                entity,
                                json.readList(entity.getSourcesJson(), SOURCE_REFERENCES)
                        )
                ));

        entities.stream()
                .filter(entity -> entity.getType() == MentionableEntityType.TECHNOLOGY)
                .filter(entity -> connections.stream().noneMatch(connection ->
                        entity.getId().equals(connection.getSource())
                                && "VALIDATED_BY".equals(connection.getLabel())))
                .forEach(entity -> saveIssue(
                        fingerprint(
                                DataIssueType.UNVALIDATED_TECHNOLOGY,
                                List.of(entity.getId()),
                                "no-validation"
                        ),
                        DataIssueType.UNVALIDATED_TECHNOLOGY,
                        DataIssueSeverity.MEDIUM,
                        "Технология не подтверждена экспериментом",
                        "Для технологии «" + entity.getTitle()
                                + "» не найдена связь с подтверждающим экспериментом.",
                        "Проверить протоколы испытаний или запланировать валидационный эксперимент.",
                        linksForKnowledgeEntity(
                                entity,
                                json.readList(entity.getSourcesJson(), SOURCE_REFERENCES)
                        )
                ));

        entities.stream()
                .filter(entity -> Set.of(
                        MentionableEntityType.PROCESS,
                        MentionableEntityType.TECHNOLOGY
                ).contains(entity.getType()))
                .forEach(entity -> {
                    List<String> locations = connections.stream()
                            .filter(connection ->
                                    entity.getId().equals(connection.getSource())
                                            && "LOCATED_IN".equals(connection.getLabel()))
                            .map(KnowledgeConnectionEntity::getTarget)
                            .map(locationId -> entities.stream()
                                    .filter(candidate -> candidate.getId().equals(locationId))
                                    .findFirst()
                                    .map(KnowledgeEntityRecord::getTitle)
                                    .orElse(""))
                            .filter(value -> !value.isBlank())
                            .toList();
                    if (locations.isEmpty()) {
                        return;
                    }
                    boolean domestic = locations.stream()
                            .anyMatch(value -> normalize(value).contains("росси"));
                    boolean foreign = locations.stream()
                            .anyMatch(value -> !normalize(value).contains("росси"));
                    if (domestic == foreign) {
                        return;
                    }
                    String coverage = domestic ? "только в России" : "только за рубежом";
                    saveIssue(
                            fingerprint(
                                    DataIssueType.GEOGRAPHY_GAP,
                                    List.of(entity.getId()),
                                    coverage
                            ),
                            DataIssueType.GEOGRAPHY_GAP,
                            DataIssueSeverity.LOW,
                            "Одностороннее географическое покрытие",
                            "Знание «" + entity.getTitle() + "» описано " + coverage + ".",
                            "Найти публикации и практические кейсы для второй географической группы.",
                            linksForKnowledgeEntity(
                                    entity,
                                    json.readList(entity.getSourcesJson(), SOURCE_REFERENCES)
                            )
                    );
                });

        int staleBefore = java.time.Year.now().getValue() - 5;
        entities.stream()
                .filter(entity -> entity.getType() == MentionableEntityType.PUBLICATION)
                .filter(entity -> entity.getPublicationYear() != null)
                .filter(entity -> entity.getPublicationYear() < staleBefore)
                .forEach(entity -> saveIssue(
                        fingerprint(
                                DataIssueType.STALE_KNOWLEDGE,
                                List.of(entity.getId()),
                                String.valueOf(entity.getPublicationYear())
                        ),
                        DataIssueType.STALE_KNOWLEDGE,
                        DataIssueSeverity.LOW,
                        "Требуется актуализация публикации",
                        "Публикация «" + entity.getTitle() + "» датирована "
                                + entity.getPublicationYear() + " годом.",
                        "Проверить наличие более свежих публикаций и экспериментов по теме.",
                        linksForKnowledgeEntity(
                                entity,
                                json.readList(entity.getSourcesJson(), SOURCE_REFERENCES)
                        )
                ));
    }

    private List<RelatedEntityLinkDto> linksForKnowledgeEntity(
            KnowledgeEntityRecord entity,
            List<SourceReferenceDto> sources
    ) {
        List<RelatedEntityLinkDto> links = new java.util.ArrayList<>();
        links.add(new RelatedEntityLinkDto(
                entity.getId(),
                entity.getTitle(),
                entity.getType()
        ));
        sources.stream()
                .map(SourceReferenceDto::documentId)
                .distinct()
                .map(documentId -> documentRepository.findById(documentId)
                        .map(document -> new RelatedEntityLinkDto(
                                document.getId(),
                                document.getTitle(),
                                MentionableEntityType.DOCUMENT
                        ))
                        .orElse(null))
                .filter(Objects::nonNull)
                .forEach(links::add);
        return links;
    }

    private void detectMissingData(List<ExperimentEntity> experiments) {
        for (ExperimentEntity experiment : experiments) {
            Map<String, String> missing = new LinkedHashMap<>();
            if (experiment.getMaterialId() == null
                    || "unknown-material".equals(experiment.getMaterialId())
                    || isMissing(experiment.getMaterial())) {
                missing.put("material", "материал");
            }
            if (experiment.getTemperature() == null) {
                missing.put("temperature", "температура");
            }
            if (isMissing(experiment.getDuration())) {
                missing.put("duration", "длительность");
            }
            if (isMissing(experiment.getCoolingMethod())) {
                missing.put("cooling_method", "режим охлаждения");
            }
            if (isMissing(experiment.getEquipment())) {
                missing.put("equipment", "оборудование");
            }
            if (isMissing(experiment.getProperty())) {
                missing.put("property", "измеряемое свойство");
            }
            ExperimentMeasurement measurement = measurement(experiment);
            if (measurement.value() == null) {
                missing.put("value_after", "результат измерения");
            } else if (measurement.unit() == null) {
                missing.put("unit", "единица измерения");
            }

            for (Map.Entry<String, String> field : missing.entrySet()) {
                List<RelatedEntityLinkDto> related = linksForExperiment(experiment);
                String id = fingerprint(
                        DataIssueType.MISSING_DATA,
                        related.stream().map(RelatedEntityLinkDto::id).toList(),
                        field.getKey()
                );
                saveIssue(
                        id,
                        DataIssueType.MISSING_DATA,
                        Set.of("material", "temperature", "value_after").contains(field.getKey())
                                ? DataIssueSeverity.HIGH
                                : DataIssueSeverity.MEDIUM,
                        "Не указано поле: " + field.getValue(),
                        "В эксперименте «" + experiment.getTitle()
                                + "» отсутствует значение поля «" + field.getValue() + "».",
                        "Проверить исходный документ или лабораторный журнал и заполнить значение.",
                        related
                );
            }
        }
    }

    private void detectUnitMismatches(List<ExperimentEntity> experiments) {
        Map<String, List<ExperimentMeasurement>> groups = measurements(experiments).stream()
                .filter(measurement -> measurement.unit() != null)
                .collect(Collectors.groupingBy(ExperimentMeasurement::groupKey));

        groups.values().forEach(group -> {
            Set<String> units = group.stream()
                    .map(ExperimentMeasurement::unit)
                    .collect(Collectors.toCollection(LinkedHashSet::new));
            if (units.size() < 2) {
                return;
            }
            ExperimentEntity sample = group.get(0).experiment();
            List<RelatedEntityLinkDto> related = linksForExperiments(
                    group.stream().map(ExperimentMeasurement::experiment).toList()
            );
            String unitList = units.stream().sorted().collect(Collectors.joining(", "));
            saveIssue(
                    fingerprint(
                            DataIssueType.UNIT_MISMATCH,
                            related.stream().map(RelatedEntityLinkDto::id).toList(),
                            normalize(sample.getProperty()) + "|" + unitList
                    ),
                    DataIssueType.UNIT_MISMATCH,
                    DataIssueSeverity.MEDIUM,
                    "Несопоставимые единицы свойства «" + sample.getProperty() + "»",
                    "Для одного материала обнаружены значения в единицах: " + unitList + ".",
                    "Привести значения к одной единице или явно указать правило пересчёта.",
                    related
            );
        });
    }

    private void detectConflicts(List<ExperimentEntity> experiments) {
        Map<String, List<ExperimentMeasurement>> groups = measurements(experiments).stream()
                .filter(measurement -> measurement.value() != null && measurement.unit() != null)
                .filter(measurement -> measurement.experiment().getTemperature() != null)
                .collect(Collectors.groupingBy(measurement ->
                        measurement.groupKey()
                                + "|" + measurement.experiment().getTemperature()
                                + "|" + measurement.unit()
                ));

        groups.values().forEach(group -> {
            if (group.size() < 2) {
                return;
            }
            double min = group.stream().map(ExperimentMeasurement::value).min(Double::compareTo).orElse(0.0);
            double max = group.stream().map(ExperimentMeasurement::value).max(Double::compareTo).orElse(0.0);
            double denominator = Math.max(Math.abs(max), 1.0);
            if ((max - min) / denominator <= 0.10) {
                return;
            }
            ExperimentEntity sample = group.get(0).experiment();
            List<RelatedEntityLinkDto> related = linksForExperiments(
                    group.stream().map(ExperimentMeasurement::experiment).toList()
            );
            saveIssue(
                    fingerprint(
                            DataIssueType.CONFLICT,
                            related.stream().map(RelatedEntityLinkDto::id).toList(),
                            normalize(sample.getProperty())
                                    + "|" + sample.getTemperature()
                                    + "|" + group.get(0).unit()
                    ),
                    DataIssueType.CONFLICT,
                    DataIssueSeverity.HIGH,
                    "Противоречивые результаты при " + sample.getTemperature() + " °C",
                    "Для одинакового материала, свойства и температуры значения различаются более чем на 10%: "
                            + format(min) + "–" + format(max) + " " + group.get(0).unit() + ".",
                    "Проверить методики измерения, режимы и повторяемость экспериментов.",
                    related
            );
        });
    }

    private void detectUnexploredRanges(List<ExperimentEntity> experiments) {
        Map<String, List<ExperimentEntity>> byMaterial = experiments.stream()
                .filter(experiment -> experiment.getTemperature() != null)
                .filter(experiment -> experiment.getMaterialId() != null)
                .filter(experiment -> !"unknown-material".equals(experiment.getMaterialId()))
                .filter(experiment -> !isMissing(experiment.getProperty()))
                .collect(Collectors.groupingBy(experiment ->
                        experiment.getMaterialId() + "|" + normalize(experiment.getProperty())
                ));

        byMaterial.forEach((groupKey, materialExperiments) -> {
            List<Integer> temperatures = materialExperiments.stream()
                    .map(ExperimentEntity::getTemperature)
                    .distinct()
                    .sorted()
                    .toList();
            for (int index = 1; index < temperatures.size(); index++) {
                int lower = temperatures.get(index - 1);
                int upper = temperatures.get(index);
                if (upper - lower <= UNEXPLORED_TEMPERATURE_GAP) {
                    continue;
                }
                List<ExperimentEntity> boundaryExperiments = materialExperiments.stream()
                        .filter(experiment ->
                                experiment.getTemperature() == lower
                                        || experiment.getTemperature() == upper
                        )
                        .toList();
                List<RelatedEntityLinkDto> related = linksForExperiments(boundaryExperiments);
                String materialName = materialExperiments.get(0).getMaterial();
                String materialId = materialExperiments.get(0).getMaterialId();
                String property = materialExperiments.get(0).getProperty();
                saveIssue(
                        fingerprint(
                                DataIssueType.UNEXPLORED_RANGE,
                                List.of(materialId),
                                "temperature|" + normalize(property) + "|" + lower + "|" + upper
                        ),
                        DataIssueType.UNEXPLORED_RANGE,
                        DataIssueSeverity.LOW,
                        "Не исследован диапазон " + lower + "–" + upper + " °C",
                        "Для материала «" + materialName + "» и свойства «" + property
                                + "» отсутствуют эксперименты между " + lower + " и " + upper + " °C.",
                        "Проверить необходимость промежуточных экспериментов в этом диапазоне.",
                        related
                );
            }
        });
    }

    private List<ExperimentMeasurement> measurements(List<ExperimentEntity> experiments) {
        return experiments.stream()
                .map(this::measurement)
                .toList();
    }

    private ExperimentMeasurement measurement(ExperimentEntity experiment) {
        String raw = experiment.getValueAfter();
        Matcher matcher = NUMBER.matcher(raw == null ? "" : raw);
        Double value = null;
        String unit = null;
        if (matcher.find()) {
            value = Double.valueOf(matcher.group().replace(",", "."));
            unit = raw.substring(matcher.end()).trim();
        }
        if (unit != null && (unit.isBlank() || "—".equals(unit))) {
            unit = null;
        }
        return new ExperimentMeasurement(
                experiment,
                value,
                unit,
                normalize(experiment.getMaterialId())
                        + "|" + normalize(experiment.getProperty())
        );
    }

    private void saveIssue(
            String id,
            DataIssueType type,
            DataIssueSeverity severity,
            String title,
            String description,
            String recommendation,
            List<RelatedEntityLinkDto> related
    ) {
        DataIssueEntity issue = issueRepository.findById(id)
                .orElseGet(() -> DataIssueEntity.builder()
                        .id(id)
                        .detectedAt(OffsetDateTime.now())
                        .build());
        issue.setType(type);
        issue.setSeverity(severity);
        issue.setTitle(title);
        issue.setDescription(description);
        issue.setRecommendation(recommendation);
        issue.setRelatedEntitiesJson(json.write(related));
        issueRepository.save(issue);
        attachIssueToRelatedRecords(id, related);
        mirrorIssueInKnowledgeGraph(issue, related);
        graphRagGateway.upsertDataIssue(
                new com.github.danbel.api.client.dto.GraphRagDataIssueRequestDto(
                        issue.getId(),
                        issue.getTitle(),
                        issue.getDescription(),
                        issue.getType().getValue(),
                        issue.getSeverity().getValue(),
                        issue.getRecommendation(),
                        related.stream()
                                .filter(link -> link.entityType() != MentionableEntityType.DOCUMENT)
                                .map(RelatedEntityLinkDto::id)
                                .toList()
                )
        );
    }

    private void mirrorIssueInKnowledgeGraph(
            DataIssueEntity issue,
            List<RelatedEntityLinkDto> related
    ) {
        long index = Math.max(knowledgeEntityRepository.count(), 1);
        List<SourceReferenceDto> sources = related.stream()
                .filter(link -> link.entityType() == MentionableEntityType.DOCUMENT)
                .map(link -> new SourceReferenceDto(
                        link.id(),
                        null,
                        null,
                        null,
                        null
                ))
                .toList();
        KnowledgeEntityRecord record = knowledgeEntityRepository.findById(issue.getId())
                .orElseGet(() -> KnowledgeEntityRecord.builder()
                        .id(issue.getId())
                        .type(MentionableEntityType.DATA_ISSUE)
                        .subtitle("Проблема в данных")
                        .positionX(180.0 + (index % 4) * 310)
                        .positionY(120.0 + (index / 4) * 180)
                        .version(1)
                        .build());
        record.setTitle(issue.getTitle());
        record.setDescription(issue.getDescription());
        record.setAttributesJson(json.write(List.of(
                new EntityAttributeDto("Тип", issue.getType().getValue(), null),
                new EntityAttributeDto("Важность", issue.getSeverity().getValue(), null)
        )));
        record.setSourcesJson(json.write(sources));
        record.setConfidence(0.8);
        record.setVerificationStatus("DETECTED");
        record.setUpdatedAt(OffsetDateTime.now());
        knowledgeEntityRepository.save(record);

        Set<String> currentRelatedIds = related.stream()
                .filter(link -> link.entityType() != MentionableEntityType.DOCUMENT)
                .map(RelatedEntityLinkDto::id)
                .collect(Collectors.toSet());
        knowledgeConnectionRepository.findAll().stream()
                .filter(connection -> issue.getId().equals(connection.getSource()))
                .filter(connection -> "RELATED_TO".equals(connection.getLabel()))
                .filter(connection -> !currentRelatedIds.contains(connection.getTarget()))
                .forEach(knowledgeConnectionRepository::delete);

        related.stream()
                .filter(link -> link.entityType() != MentionableEntityType.DOCUMENT)
                .filter(link -> knowledgeEntityRepository.existsById(link.id()))
                .forEach(link -> knowledgeConnectionRepository.save(
                        KnowledgeConnectionEntity.builder()
                                .id(relationFingerprint(
                                        "data-quality",
                                        issue.getId(),
                                        "RELATED_TO",
                                        link.id()
                                ))
                                .source(issue.getId())
                                .target(link.id())
                                .label("RELATED_TO")
                                .build()
                ));
    }

    private void attachIssueToRelatedRecords(
            String issueId,
            List<RelatedEntityLinkDto> related
    ) {
        related.forEach(link -> {
            if (link.entityType() == MentionableEntityType.DOCUMENT) {
                documentRepository.findById(link.id()).ifPresent(document -> {
                    document.setIssueIdsJson(appendId(document.getIssueIdsJson(), issueId));
                    documentRepository.save(document);
                });
            }
            if (link.entityType() == MentionableEntityType.MATERIAL) {
                materialRepository.findById(link.id()).ifPresent(material -> {
                    material.setIssueIdsJson(appendId(material.getIssueIdsJson(), issueId));
                    materialRepository.save(material);
                });
            }
            if (link.entityType() == MentionableEntityType.EXPERIMENT) {
                experimentRepository.findById(link.id()).ifPresent(experiment ->
                        documentRepository.findById(experiment.getSourceDocumentId()).ifPresent(document -> {
                            document.setIssueIdsJson(appendId(document.getIssueIdsJson(), issueId));
                            documentRepository.save(document);
                        })
                );
            }
        });
    }

    private String appendId(String jsonValue, String id) {
        LinkedHashSet<String> ids = new LinkedHashSet<>(
                json.readList(jsonValue, STRING_LIST)
        );
        ids.add(id);
        return json.write(new ArrayList<>(ids));
    }

    private List<RelatedEntityLinkDto> relatedLinks(
            String issueId,
            List<ExtractedRelationDto> relations,
            Map<String, ExtractedEntityDto> entitiesById
    ) {
        List<RelatedEntityLinkDto> result = new ArrayList<>();
        relations.stream()
                .filter(relation ->
                        issueId.equals(relation.sourceId())
                                || issueId.equals(relation.targetId())
                )
                .map(relation ->
                        issueId.equals(relation.sourceId())
                                ? relation.targetId()
                                : relation.sourceId()
                )
                .distinct()
                .map(entitiesById::get)
                .filter(Objects::nonNull)
                .map(entity -> new RelatedEntityLinkDto(
                        entity.id(),
                        entity.name(),
                        entity.type()
                ))
                .forEach(result::add);
        return result;
    }

    private List<RelatedEntityLinkDto> linksForExperiment(ExperimentEntity experiment) {
        List<RelatedEntityLinkDto> links = new ArrayList<>();
        links.add(new RelatedEntityLinkDto(
                experiment.getId(),
                experiment.getTitle(),
                MentionableEntityType.EXPERIMENT
        ));
        if (experiment.getMaterialId() != null) {
            links.add(new RelatedEntityLinkDto(
                    experiment.getMaterialId(),
                    experiment.getMaterial(),
                    MentionableEntityType.MATERIAL
            ));
        }
        if (experiment.getSourceDocumentId() != null) {
            links.add(new RelatedEntityLinkDto(
                    experiment.getSourceDocumentId(),
                    experiment.getSourceName(),
                    MentionableEntityType.DOCUMENT
            ));
        }
        return links;
    }

    private List<RelatedEntityLinkDto> linksForExperiments(
            List<ExperimentEntity> experiments
    ) {
        List<RelatedEntityLinkDto> links = new ArrayList<>();
        experiments.forEach(experiment ->
                links.addAll(linksForExperiment(experiment))
        );
        return links.stream()
                .collect(Collectors.toMap(
                        link -> link.entityType() + ":" + link.id(),
                        Function.identity(),
                        (left, right) -> left,
                        LinkedHashMap::new
                ))
                .values()
                .stream()
                .toList();
    }

    private List<String> relatedEntityIds(
            String issueId,
            List<ExtractedRelationDto> relations
    ) {
        return relations.stream()
                .filter(relation ->
                        issueId.equals(relation.sourceId())
                                || issueId.equals(relation.targetId())
                )
                .map(relation ->
                        issueId.equals(relation.sourceId())
                                ? relation.targetId()
                                : relation.sourceId()
                )
                .sorted()
                .toList();
    }

    private String issueDiscriminator(ExtractedEntityDto entity) {
        String attributes = Optional.ofNullable(entity.attributes()).orElse(List.of()).stream()
                .filter(attribute -> !isPresentationAttribute(attribute.name()))
                .sorted(Comparator.comparing(attribute -> normalize(attribute.name())))
                .map(attribute ->
                        normalize(attribute.name()) + "=" + normalize(String.valueOf(attribute.value()))
                )
                .collect(Collectors.joining("|"));
        return attributes.isBlank() ? normalize(entity.name()) : attributes;
    }

    private boolean isPresentationAttribute(String name) {
        String normalized = normalize(name);
        return normalized.contains("severity")
                || normalized.contains("важност")
                || normalized.contains("recommendation")
                || normalized.contains("рекомендац")
                || normalized.contains("description")
                || normalized.contains("описан");
    }

    private DataIssueType inferType(ExtractedEntityDto entity) {
        String value = attribute(entity, "issue type", "тип проблемы", "type", "тип")
                .orElse(entity.name());
        String normalized = normalize(value);
        if (normalized.contains("unit") || normalized.contains("единиц")) {
            return DataIssueType.UNIT_MISMATCH;
        }
        if (normalized.contains("conflict")
                || normalized.contains("противореч")
                || normalized.contains("расхожд")) {
            return DataIssueType.CONFLICT;
        }
        if (normalized.contains("range")
                || normalized.contains("диапазон")
                || normalized.contains("не исслед")) {
            return DataIssueType.UNEXPLORED_RANGE;
        }
        if (normalized.contains("географ")) {
            return DataIssueType.GEOGRAPHY_GAP;
        }
        if (normalized.contains("подтверж")
                || normalized.contains("источник")) {
            return DataIssueType.WEAK_EVIDENCE;
        }
        if (normalized.contains("валидац")
                || normalized.contains("не провер")) {
            return DataIssueType.UNVALIDATED_TECHNOLOGY;
        }
        if (normalized.contains("устар")
                || normalized.contains("актуализ")) {
            return DataIssueType.STALE_KNOWLEDGE;
        }
        return DataIssueType.MISSING_DATA;
    }

    private DataIssueSeverity inferSeverity(ExtractedEntityDto entity) {
        String severity = attribute(entity, "severity", "важность", "критичность")
                .orElse("medium");
        String normalized = normalize(severity);
        if (normalized.contains("high") || normalized.contains("высок")) {
            return DataIssueSeverity.HIGH;
        }
        if (normalized.contains("low") || normalized.contains("низк")) {
            return DataIssueSeverity.LOW;
        }
        return DataIssueSeverity.MEDIUM;
    }

    private Optional<String> attribute(
            ExtractedEntityDto entity,
            String... names
    ) {
        Set<String> normalizedNames = List.of(names).stream()
                .map(this::normalize)
                .collect(Collectors.toSet());
        return Optional.ofNullable(entity.attributes()).orElse(List.of()).stream()
                .filter(attribute -> normalizedNames.contains(normalize(attribute.name())))
                .map(EntityAttributeDto::value)
                .filter(Objects::nonNull)
                .map(String::valueOf)
                .filter(value -> !value.isBlank())
                .findFirst();
    }

    private List<RelatedEntityLinkDto> appendRelated(
            List<RelatedEntityLinkDto> links,
            RelatedEntityLinkDto link
    ) {
        List<RelatedEntityLinkDto> result = new ArrayList<>(links);
        boolean exists = result.stream().anyMatch(item ->
                item.id().equals(link.id()) && item.entityType() == link.entityType()
        );
        if (!exists) {
            result.add(link);
        }
        return result;
    }

    private String fingerprint(
            DataIssueType type,
            List<String> relatedIds,
            String discriminator
    ) {
        String related = relatedIds.stream().sorted().collect(Collectors.joining(","));
        return "issue-" + sha256(
                type.getValue() + "|" + related + "|" + normalize(discriminator)
        ).substring(0, 20);
    }

    private String relationFingerprint(
            String documentId,
            String sourceId,
            String type,
            String targetId
    ) {
        return "relation-" + sha256(
                documentId + "|" + sourceId + "|" + type + "|" + targetId
        ).substring(0, 20);
    }

    private String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder result = new StringBuilder();
            for (byte item : digest) {
                result.append(String.format("%02x", item));
            }
            return result.toString();
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available", exception);
        }
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }
        return value.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-zа-яё0-9]+", " ")
                .trim();
    }

    private boolean isMissing(String value) {
        String normalized = normalize(value);
        return normalized.isBlank()
                || "не указано".equals(normalized)
                || "свойство не указано".equals(normalized)
                || "материал не указан".equals(normalized);
    }

    private String format(double value) {
        return value == Math.rint(value)
                ? String.valueOf((long) value)
                : String.format(Locale.ROOT, "%.2f", value);
    }

    private List<ExtractedEntityDto> safeEntities(PublishExtractionRequestDto request) {
        return request.entities() == null ? List.of() : request.entities();
    }

    private List<ExtractedRelationDto> safeRelations(PublishExtractionRequestDto request) {
        return request.relations() == null ? List.of() : request.relations();
    }

    private record ExperimentMeasurement(
            ExperimentEntity experiment,
            Double value,
            String unit,
            String groupKey
    ) {
    }
}
