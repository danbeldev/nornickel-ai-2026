package com.github.danbel.api.service;

import com.github.danbel.api.dto.graph.KnowledgeGraphDataDto;
import com.github.danbel.api.dto.graph.KnowledgeGraphEntityDto;
import com.github.danbel.api.dto.graph.KnowledgeFactDto;
import com.github.danbel.api.dto.graph.KnowledgeEntityVersionDto;
import com.github.danbel.api.dto.graph.UpdateKnowledgeEntityRequestDto;
import com.github.danbel.api.dto.graph.UpdateKnowledgeConnectionRequestDto;
import com.github.danbel.api.dto.graph.MergeKnowledgeEntitiesRequestDto;
import com.github.danbel.api.dto.graph.KnowledgeGraphConnectionDto;
import com.github.danbel.api.dto.graph.CreateKnowledgeConnectionRequestDto;
import com.github.danbel.api.dto.common.EntityAttributeDto;
import com.github.danbel.api.dto.common.SourceReferenceDto;
import com.github.danbel.api.client.dto.GraphRagUpdateEntityRequestDto;
import com.github.danbel.api.exception.ResourceNotFoundException;
import com.github.danbel.api.mapper.ApiDtoMapper;
import com.github.danbel.api.mapper.JsonPayloadMapper;
import com.github.danbel.api.model.entity.KnowledgeConnectionEntity;
import com.github.danbel.api.model.entity.KnowledgeConnectionVersionEntity;
import com.github.danbel.api.model.entity.KnowledgeEntityRecord;
import com.github.danbel.api.model.entity.KnowledgeEntityVersionEntity;
import com.github.danbel.api.model.entity.KnowledgeFactEntity;
import com.github.danbel.api.repository.KnowledgeConnectionRepository;
import com.github.danbel.api.repository.KnowledgeConnectionVersionRepository;
import com.github.danbel.api.repository.KnowledgeEntityRepository;
import com.github.danbel.api.repository.KnowledgeEntityVersionRepository;
import com.github.danbel.api.repository.KnowledgeFactRepository;
import com.github.danbel.api.repository.DocumentRepository;
import com.github.danbel.api.repository.MaterialRepository;
import com.github.danbel.api.repository.ExperimentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.UUID;
import java.util.ArrayList;
import tools.jackson.core.type.TypeReference;

@Service
@RequiredArgsConstructor
public class KnowledgeGraphService {

    private static final TypeReference<List<EntityAttributeDto>> ATTRIBUTES = new TypeReference<>() {
    };
    private static final TypeReference<List<SourceReferenceDto>> SOURCES = new TypeReference<>() {
    };
    private static final TypeReference<List<String>> STRING_LIST = new TypeReference<>() {
    };

    private final KnowledgeEntityRepository entityRepository;
    private final KnowledgeConnectionRepository connectionRepository;
    private final KnowledgeConnectionVersionRepository connectionVersionRepository;
    private final KnowledgeFactRepository factRepository;
    private final KnowledgeEntityVersionRepository versionRepository;
    private final DocumentRepository documentRepository;
    private final MaterialRepository materialRepository;
    private final ExperimentRepository experimentRepository;
    private final JsonPayloadMapper json;
    private final GraphRagGateway graphRagGateway;
    private final KnowledgeRelationPolicy relationPolicy;
    private final ApiDtoMapper mapper;

    public KnowledgeGraphDataDto getGraph() {
        return new KnowledgeGraphDataDto(
                entityRepository.findAll().stream().map(mapper::toKnowledgeEntity).toList(),
                connectionRepository.findAll().stream().map(mapper::toKnowledgeConnection).toList()
        );
    }

    public KnowledgeGraphDataDto getPreview() {
        return new KnowledgeGraphDataDto(
                entityRepository.findAll().stream().map(mapper::toKnowledgeEntity).toList(),
                connectionRepository.findAll().stream().map(mapper::toKnowledgeConnection).toList()
        );
    }

    public KnowledgeEntityRecord getEntityRecord(String entityId) {
        return entityRepository.findById(entityId)
                .orElseThrow(() -> new ResourceNotFoundException("Knowledge entity not found: " + entityId));
    }

    public KnowledgeGraphEntityDto getEntity(String entityId) {
        return mapper.toKnowledgeEntity(getEntityRecord(entityId));
    }

    public List<KnowledgeFactDto> getFacts(String entityId) {
        getEntityRecord(entityId);
        return factRepository.findAllByEntity_IdOrderByNameAsc(entityId).stream()
                .map(fact -> new KnowledgeFactDto(
                        fact.getId(),
                        fact.getName(),
                        fact.getOperator(),
                        fact.getNumericValue(),
                        fact.getMinValue(),
                        fact.getMaxValue(),
                        fact.getUnit(),
                        fact.getNormalizedUnit(),
                        fact.getTextValue(),
                        fact.getSourceDocumentId(),
                        fact.getSourcePage(),
                        fact.getConfidence()
                ))
                .toList();
    }

    public List<KnowledgeEntityVersionDto> getVersions(String entityId) {
        getEntityRecord(entityId);
        return versionRepository.findAllByEntity_IdOrderByVersionDesc(entityId).stream()
                .map(version -> new KnowledgeEntityVersionDto(
                        version.getId(),
                        version.getVersion(),
                        version.getChangeType(),
                        version.getChangeMessage(),
                        version.getSnapshotJson(),
                        version.getChangedAt()
                ))
                .toList();
    }

    @Transactional
    public KnowledgeGraphEntityDto updateEntity(
            String entityId,
            UpdateKnowledgeEntityRequestDto request
    ) {
        KnowledgeEntityRecord entity = getEntityRecord(entityId);
        if (request.type() == com.github.danbel.api.model.enums.MentionableEntityType.DOCUMENT) {
            throw new IllegalArgumentException(
                    "Document is a source record and cannot replace a graph entity type"
            );
        }
        validateTypeChange(entity, request);
        List<EntityAttributeDto> normalizedAttributes = normalizeAttributes(
                request.attributes() == null ? List.of() : request.attributes()
        );
        entity.setType(request.type());
        entity.setTitle(request.title().strip());
        entity.setDescription(request.description().strip());
        entity.setAttributesJson(json.write(normalizedAttributes));
        entity.setConfidence(request.confidence() == null ? entity.getConfidence() : request.confidence());
        entity.setVerificationStatus(
                request.verificationStatus() == null
                        ? "REVIEWED"
                        : request.verificationStatus()
        );
        entity.setGeography(request.geography());
        entity.setPublicationYear(request.publicationYear());
        entity.setLanguage(request.language());
        entity.setVersion(entity.getVersion() + 1);
        entity.setUpdatedAt(OffsetDateTime.now());

        graphRagGateway.updateEntity(entityId, new GraphRagUpdateEntityRequestDto(
                entityId,
                entity.getType(),
                entity.getTitle(),
                entity.getDescription(),
                normalizedAttributes,
                entity.getConfidence(),
                entity.getVerificationStatus(),
                entity.getGeography(),
                entity.getPublicationYear(),
                entity.getLanguage()
        ));
        entityRepository.save(entity);
        replaceFacts(entity, normalizedAttributes);
        saveVersion(entity, request.changeMessage());
        return mapper.toKnowledgeEntity(entity);
    }

    private void validateTypeChange(
            KnowledgeEntityRecord entity,
            UpdateKnowledgeEntityRequestDto request
    ) {
        if (entity.getType() == request.type()) {
            return;
        }
        for (KnowledgeConnectionEntity connection : connectionRepository.findAll()) {
            if (!entity.getId().equals(connection.getSource())
                    && !entity.getId().equals(connection.getTarget())) {
                continue;
            }
            KnowledgeEntityRecord source = entity.getId().equals(connection.getSource())
                    ? entity
                    : getEntityRecord(connection.getSource());
            KnowledgeEntityRecord target = entity.getId().equals(connection.getTarget())
                    ? entity
                    : getEntityRecord(connection.getTarget());
            var sourceType = entity.getId().equals(connection.getSource())
                    ? request.type()
                    : source.getType();
            var targetType = entity.getId().equals(connection.getTarget())
                    ? request.type()
                    : target.getType();
            if (relationPolicy.normalizeAndValidate(
                    sourceType,
                    connection.getLabel(),
                    targetType
            ) == null) {
                throw new IllegalArgumentException(
                        "Новый тип нарушает существующую связь " + connection.getLabel()
                );
            }
        }
    }

    @Transactional
    public KnowledgeGraphConnectionDto updateConnection(
            String connectionId,
            UpdateKnowledgeConnectionRequestDto request
    ) {
        KnowledgeConnectionEntity connection = connectionRepository.findById(connectionId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Knowledge connection not found: " + connectionId
                ));
        KnowledgeEntityRecord source = getEntityRecord(connection.getSource());
        KnowledgeEntityRecord target = getEntityRecord(connection.getTarget());
        String relationType = relationPolicy.normalizeAndValidate(
                source.getType(),
                request.relationType(),
                target.getType()
        );
        if (relationType == null) {
            throw new IllegalArgumentException(
                    "Relation is not allowed for %s -> %s"
                            .formatted(source.getType(), target.getType())
            );
        }
        graphRagGateway.updateRelation(connectionId, relationType);
        connection.setLabel(relationType);
        connectionRepository.save(connection);
        saveConnectionVersion(connection, "UPDATED", request.changeMessage());
        return mapper.toKnowledgeConnection(connection);
    }

    @Transactional
    public KnowledgeGraphConnectionDto createConnection(
            CreateKnowledgeConnectionRequestDto request
    ) {
        KnowledgeEntityRecord source = getEntityRecord(request.sourceId());
        KnowledgeEntityRecord target = getEntityRecord(request.targetId());
        String relationType = relationPolicy.normalizeAndValidate(
                source.getType(),
                request.relationType(),
                target.getType()
        );
        if (relationType == null) {
            throw new IllegalArgumentException(
                    "Relation is not allowed for %s -> %s"
                            .formatted(source.getType(), target.getType())
            );
        }
        String connectionId = "relation-" + UUID.randomUUID();
        graphRagGateway.createRelation(
                connectionId,
                source.getId(),
                target.getId(),
                relationType
        );
        KnowledgeConnectionEntity connection = connectionRepository.save(
                KnowledgeConnectionEntity.builder()
                        .id(connectionId)
                        .source(source.getId())
                        .target(target.getId())
                        .label(relationType)
                        .build()
        );
        saveConnectionVersion(connection, "CREATED", request.changeMessage());
        return mapper.toKnowledgeConnection(connection);
    }

    @Transactional
    public void deleteConnection(String connectionId, String changeMessage) {
        KnowledgeConnectionEntity connection = connectionRepository.findById(connectionId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Knowledge connection not found: " + connectionId
                ));
        graphRagGateway.deleteRelation(connectionId);
        saveConnectionVersion(connection, "DELETED", changeMessage);
        connectionRepository.delete(connection);
    }

    @Transactional
    public KnowledgeGraphEntityDto mergeEntity(
            String sourceEntityId,
            MergeKnowledgeEntitiesRequestDto request
    ) {
        KnowledgeEntityRecord source = getEntityRecord(sourceEntityId);
        KnowledgeEntityRecord target = getEntityRecord(request.targetEntityId());
        if (source.getId().equals(target.getId())) {
            throw new IllegalArgumentException("Cannot merge an entity into itself");
        }
        if (source.getType() != target.getType()) {
            throw new IllegalArgumentException("Only entities of the same type can be merged");
        }

        graphRagGateway.mergeEntities(source.getId(), target.getId());
        List<EntityAttributeDto> mergedAttributes = mergeAttributes(source, target);
        List<SourceReferenceDto> mergedSources = mergeSources(source, target);
        target.setAttributesJson(json.write(mergedAttributes));
        target.setSourcesJson(json.write(mergedSources));
        if (source.getDescription().length() > target.getDescription().length()) {
            target.setDescription(source.getDescription());
        }
        target.setConfidence(Math.max(source.getConfidence(), target.getConfidence()));
        if (target.getGeography() == null) target.setGeography(source.getGeography());
        if (target.getPublicationYear() == null) target.setPublicationYear(source.getPublicationYear());
        if (target.getLanguage() == null) target.setLanguage(source.getLanguage());
        target.setVerificationStatus("REVIEWED");
        target.setVersion(target.getVersion() + 1);
        target.setUpdatedAt(OffsetDateTime.now());
        entityRepository.save(target);

        factRepository.findAllByEntity_IdOrderByNameAsc(source.getId()).forEach(fact -> {
            fact.setEntity(target);
            factRepository.save(fact);
        });
        // Persist the new owner before deleting the source entity. Otherwise the
        // database cascade can still see the old foreign key and remove moved facts.
        factRepository.flush();
        connectionRepository.findAll().stream()
                .filter(connection ->
                        source.getId().equals(connection.getSource())
                                || source.getId().equals(connection.getTarget()))
                .forEach(connection -> {
                    if (source.getId().equals(connection.getSource())) {
                        connection.setSource(target.getId());
                    }
                    if (source.getId().equals(connection.getTarget())) {
                        connection.setTarget(target.getId());
                    }
                    if (connection.getSource().equals(connection.getTarget())) {
                        connectionRepository.delete(connection);
                    } else {
                        connectionRepository.save(connection);
                    }
                });
        replaceReferences(source, target);
        entityRepository.delete(source);
        saveVersion(
                target,
                request.changeMessage() == null || request.changeMessage().isBlank()
                        ? "Объединено с сущностью " + sourceEntityId
                        : request.changeMessage()
        );
        return mapper.toKnowledgeEntity(target);
    }

    private void replaceReferences(
            KnowledgeEntityRecord source,
            KnowledgeEntityRecord target
    ) {
        documentRepository.findAll().forEach(document -> {
            document.setMaterialIdsJson(replaceId(
                    document.getMaterialIdsJson(),
                    source.getId(),
                    target.getId()
            ));
            document.setExperimentIdsJson(replaceId(
                    document.getExperimentIdsJson(),
                    source.getId(),
                    target.getId()
            ));
            document.setIssueIdsJson(replaceId(
                    document.getIssueIdsJson(),
                    source.getId(),
                    target.getId()
            ));
            documentRepository.save(document);
        });
        materialRepository.findAll().forEach(material -> {
            material.setExperimentIdsJson(replaceId(
                    material.getExperimentIdsJson(),
                    source.getId(),
                    target.getId()
            ));
            material.setIssueIdsJson(replaceId(
                    material.getIssueIdsJson(),
                    source.getId(),
                    target.getId()
            ));
            materialRepository.save(material);
        });
        experimentRepository.findAll().stream()
                .filter(experiment -> source.getId().equals(experiment.getMaterialId()))
                .forEach(experiment -> {
                    experiment.setMaterialId(target.getId());
                    experiment.setMaterial(target.getTitle());
                    experimentRepository.save(experiment);
                });
        if (source.getType() == com.github.danbel.api.model.enums.MentionableEntityType.MATERIAL
                && materialRepository.existsById(source.getId())) {
            var sourceMaterial = materialRepository.findById(source.getId()).orElseThrow();
            materialRepository.findById(target.getId()).ifPresent(targetMaterial -> {
                targetMaterial.setAliasesJson(mergeStringLists(
                        targetMaterial.getAliasesJson(),
                        sourceMaterial.getAliasesJson()
                ));
                targetMaterial.setExperimentIdsJson(mergeStringLists(
                        targetMaterial.getExperimentIdsJson(),
                        sourceMaterial.getExperimentIdsJson()
                ));
                targetMaterial.setDocumentIdsJson(mergeStringLists(
                        targetMaterial.getDocumentIdsJson(),
                        sourceMaterial.getDocumentIdsJson()
                ));
                targetMaterial.setIssueIdsJson(mergeStringLists(
                        targetMaterial.getIssueIdsJson(),
                        sourceMaterial.getIssueIdsJson()
                ));
                materialRepository.save(targetMaterial);
            });
            materialRepository.deleteById(source.getId());
        }
        if (source.getType() == com.github.danbel.api.model.enums.MentionableEntityType.EXPERIMENT
                && experimentRepository.existsById(source.getId())) {
            experimentRepository.deleteById(source.getId());
        }
    }

    private String replaceId(String payload, String sourceId, String targetId) {
        List<String> values = new ArrayList<>(json.readList(payload, STRING_LIST));
        boolean replaced = values.removeIf(sourceId::equals);
        if (replaced && !values.contains(targetId)) {
            values.add(targetId);
        }
        return json.write(values);
    }

    private String mergeStringLists(String first, String second) {
        java.util.LinkedHashSet<String> values = new java.util.LinkedHashSet<>(
                json.readList(first, STRING_LIST)
        );
        values.addAll(json.readList(second, STRING_LIST));
        return json.write(values);
    }

    public void saveEntity(KnowledgeEntityRecord entity) {
        entityRepository.save(entity);
    }

    public void saveConnection(KnowledgeConnectionEntity connection) {
        connectionRepository.save(connection);
    }

    private void replaceFacts(
            KnowledgeEntityRecord entity,
            List<EntityAttributeDto> attributes
    ) {
        // Keep source facts intact: expert corrections form a separate canonical
        // layer and can be audited independently from extracted provenance.
        factRepository.deleteAllByEntity_IdAndSourceDocumentIdIsNull(entity.getId());
        OffsetDateTime now = OffsetDateTime.now();
        for (int index = 0; index < attributes.size(); index++) {
            var attribute = attributes.get(index);
            factRepository.save(KnowledgeFactEntity.builder()
                    .id("fact-" + UUID.nameUUIDFromBytes(
                            ("manual:" + entity.getId() + ":" + attribute.name() + ":" + index)
                                    .getBytes(StandardCharsets.UTF_8)
                    ))
                    .entity(entity)
                    .name(attribute.name())
                    .operator(attribute.operator())
                    .numericValue(attribute.numericValue())
                    .minValue(attribute.minValue())
                    .maxValue(attribute.maxValue())
                    .unit(attribute.unit())
                    .normalizedUnit(attribute.normalizedUnit())
                    .textValue(String.valueOf(attribute.value()))
                    .confidence(entity.getConfidence())
                    .createdAt(now)
                    .updatedAt(now)
                    .build());
        }
    }

    private List<EntityAttributeDto> normalizeAttributes(
            List<EntityAttributeDto> attributes
    ) {
        return attributes.stream().map(attribute -> {
            UnitNormalization unit = normalizeUnit(attribute.unit());
            double factor = attribute.normalizedUnit() != null
                    && attribute.normalizedUnit().equalsIgnoreCase(
                            unit.unit() == null ? "" : unit.unit()
                    )
                    ? 1.0
                    : unit.factor();
            return new EntityAttributeDto(
                    attribute.name(),
                    attribute.value(),
                    attribute.unit(),
                    attribute.operator(),
                    multiply(attribute.numericValue(), factor),
                    multiply(attribute.minValue(), factor),
                    multiply(attribute.maxValue(), factor),
                    unit.unit()
            );
        }).toList();
    }

    private Double multiply(Double value, double factor) {
        return value == null ? null : value * factor;
    }

    private UnitNormalization normalizeUnit(String unit) {
        if (unit == null || unit.isBlank()) {
            return new UnitNormalization(null, 1.0);
        }
        String normalized = unit.toLowerCase(java.util.Locale.ROOT)
                .replaceAll("\\s+", "");
        return switch (normalized) {
            case "мг/л", "мг/дм3", "мг/дм³", "mg/l" ->
                    new UnitNormalization("mg/L", 1.0);
            case "г/л", "g/l", "кг/м3", "kg/m3" ->
                    new UnitNormalization("mg/L", 1000.0);
            case "°c", "c" -> new UnitNormalization("°C", 1.0);
            case "мпа", "mpa" -> new UnitNormalization("MPa", 1.0);
            case "кпа", "kpa" -> new UnitNormalization("MPa", 0.001);
            case "па", "pa" -> new UnitNormalization("MPa", 0.000001);
            case "ч", "час", "часа", "часов", "h" ->
                    new UnitNormalization("h", 1.0);
            case "мин", "min" -> new UnitNormalization("h", 1.0 / 60.0);
            default -> new UnitNormalization(unit.strip(), 1.0);
        };
    }

    private void saveVersion(KnowledgeEntityRecord entity, String message) {
        LinkedHashMap<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("type", entity.getType());
        snapshot.put("title", entity.getTitle());
        snapshot.put("description", entity.getDescription());
        snapshot.put("attributes", entity.getAttributesJson());
        snapshot.put("sources", entity.getSourcesJson());
        snapshot.put("confidence", entity.getConfidence());
        snapshot.put("verificationStatus", entity.getVerificationStatus());
        snapshot.put("geography", entity.getGeography());
        snapshot.put("publicationYear", entity.getPublicationYear());
        snapshot.put("language", entity.getLanguage());
        versionRepository.save(KnowledgeEntityVersionEntity.builder()
                .id("version-" + UUID.nameUUIDFromBytes(
                        (entity.getId() + ":" + entity.getVersion()).getBytes(StandardCharsets.UTF_8)
                ))
                .entity(entity)
                .version(entity.getVersion())
                .changeType("MANUAL_UPDATE")
                .changeMessage(message == null || message.isBlank()
                        ? "Ручная корректировка экспертом"
                        : message.strip())
                .snapshotJson(json.write(snapshot))
                .changedAt(entity.getUpdatedAt())
                .build());
    }

    private void saveConnectionVersion(
            KnowledgeConnectionEntity connection,
            String changeType,
            String message
    ) {
        OffsetDateTime now = OffsetDateTime.now();
        connectionVersionRepository.save(KnowledgeConnectionVersionEntity.builder()
                .id("connection-version-" + UUID.randomUUID())
                .connectionId(connection.getId())
                .sourceId(connection.getSource())
                .targetId(connection.getTarget())
                .relationType(connection.getLabel())
                .changeType(changeType)
                .changeMessage(message)
                .changedAt(now)
                .build());
    }

    private List<EntityAttributeDto> mergeAttributes(
            KnowledgeEntityRecord source,
            KnowledgeEntityRecord target
    ) {
        List<EntityAttributeDto> result = new ArrayList<>(
                json.readList(target.getAttributesJson(), ATTRIBUTES)
        );
        json.readList(source.getAttributesJson(), ATTRIBUTES).stream()
                .filter(candidate -> result.stream().noneMatch(existing ->
                        existing.name().equalsIgnoreCase(candidate.name())
                                && String.valueOf(existing.value()).equalsIgnoreCase(
                                        String.valueOf(candidate.value())
                                )))
                .forEach(result::add);
        return result;
    }

    private List<SourceReferenceDto> mergeSources(
            KnowledgeEntityRecord source,
            KnowledgeEntityRecord target
    ) {
        List<SourceReferenceDto> result = new ArrayList<>(
                json.readList(target.getSourcesJson(), SOURCES)
        );
        json.readList(source.getSourcesJson(), SOURCES).stream()
                .filter(candidate -> result.stream().noneMatch(existing ->
                        java.util.Objects.equals(existing.documentId(), candidate.documentId())
                                && java.util.Objects.equals(existing.page(), candidate.page())))
                .forEach(result::add);
        return result;
    }

    private record UnitNormalization(String unit, double factor) {
    }
}
