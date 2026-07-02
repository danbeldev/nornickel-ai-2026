package com.github.danbel.api.service;

import com.github.danbel.api.dto.document.ExtractedEntityDto;
import com.github.danbel.api.dto.document.ExtractedRelationDto;
import com.github.danbel.api.dto.document.PublishExtractionRequestDto;
import com.github.danbel.api.model.enums.MentionableEntityType;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class KnowledgeRelationPolicy {

    private static final Map<String, String> ALIASES = Map.ofEntries(
            Map.entry("USING_REGIME", "USES_REGIME"),
            Map.entry("USED_REGIME", "USES_REGIME"),
            Map.entry("APPLIES_REGIME", "USES_REGIME"),
            Map.entry("USER_MATERIAL", "USES_MATERIAL"),
            Map.entry("USING_MATERIAL", "USES_MATERIAL"),
            Map.entry("USED_MATERIAL", "USES_MATERIAL"),
            Map.entry("MEASURED", "MEASURES"),
            Map.entry("USES_DEVICE", "USES_EQUIPMENT"),
            Map.entry("USES_INSTRUMENT", "USES_EQUIPMENT"),
            Map.entry("PERFORMED_WITH", "USES_EQUIPMENT"),
            Map.entry("USES_METHOD", "USES_PROCESS"),
            Map.entry("APPLIES_PROCESS", "USES_PROCESS"),
            Map.entry("HAS_LOCATION", "LOCATED_IN"),
            Map.entry("CONDUCTED_IN", "LOCATED_IN"),
            Map.entry("PUBLISHED_IN", "DESCRIBED_IN"),
            Map.entry("HAS_COST", "HAS_ECONOMIC_INDICATOR")
    );

    private static final Set<RelationPattern> ALLOWED = Set.of(
            pattern(MentionableEntityType.EXPERIMENT, "USES_MATERIAL", MentionableEntityType.MATERIAL),
            pattern(MentionableEntityType.EXPERIMENT, "USES_REGIME", MentionableEntityType.REGIME),
            pattern(MentionableEntityType.EXPERIMENT, "AFFECTS", MentionableEntityType.PROPERTY),
            pattern(MentionableEntityType.EXPERIMENT, "MEASURES", MentionableEntityType.PROPERTY),
            pattern(MentionableEntityType.EXPERIMENT, "USES_EQUIPMENT", MentionableEntityType.EQUIPMENT),
            pattern(MentionableEntityType.EXPERIMENT, "PERFORMED_BY", MentionableEntityType.TEAM),
            pattern(MentionableEntityType.EXPERIMENT, "PRODUCES_CONCLUSION", MentionableEntityType.CONCLUSION),
            pattern(MentionableEntityType.CONCLUSION, "BASED_ON", MentionableEntityType.EXPERIMENT),
            pattern(MentionableEntityType.DATA_ISSUE, "RELATED_TO", MentionableEntityType.MATERIAL),
            pattern(MentionableEntityType.DATA_ISSUE, "RELATED_TO", MentionableEntityType.EXPERIMENT),
            pattern(MentionableEntityType.DATA_ISSUE, "RELATED_TO", MentionableEntityType.PROPERTY),
            pattern(MentionableEntityType.MATERIAL, "COMPARED_WITH", MentionableEntityType.MATERIAL),
            pattern(MentionableEntityType.EXPERIMENT, "USES", MentionableEntityType.UNCLASSIFIED),
            pattern(MentionableEntityType.EXPERIMENT, "USES_PROCESS", MentionableEntityType.PROCESS),
            pattern(MentionableEntityType.EXPERIMENT, "LOCATED_IN", MentionableEntityType.GEOGRAPHY),
            pattern(MentionableEntityType.EXPERIMENT, "IMPLEMENTED_AT", MentionableEntityType.FACILITY),
            pattern(MentionableEntityType.EXPERIMENT, "DESCRIBED_IN", MentionableEntityType.PUBLICATION),
            pattern(MentionableEntityType.EXPERIMENT, "HAS_ECONOMIC_INDICATOR", MentionableEntityType.ECONOMIC_INDICATOR),
            pattern(MentionableEntityType.PROCESS, "USES_MATERIAL", MentionableEntityType.MATERIAL),
            pattern(MentionableEntityType.PROCESS, "USES_EQUIPMENT", MentionableEntityType.EQUIPMENT),
            pattern(MentionableEntityType.PROCESS, "PRODUCES_OUTPUT", MentionableEntityType.MATERIAL),
            pattern(MentionableEntityType.PROCESS, "LOCATED_IN", MentionableEntityType.GEOGRAPHY),
            pattern(MentionableEntityType.PROCESS, "DESCRIBED_IN", MentionableEntityType.PUBLICATION),
            pattern(MentionableEntityType.PROCESS, "HAS_ECONOMIC_INDICATOR", MentionableEntityType.ECONOMIC_INDICATOR),
            pattern(MentionableEntityType.TECHNOLOGY, "APPLIES_TO", MentionableEntityType.MATERIAL),
            pattern(MentionableEntityType.TECHNOLOGY, "USES_PROCESS", MentionableEntityType.PROCESS),
            pattern(MentionableEntityType.TECHNOLOGY, "USES_EQUIPMENT", MentionableEntityType.EQUIPMENT),
            pattern(MentionableEntityType.TECHNOLOGY, "IMPLEMENTED_AT", MentionableEntityType.FACILITY),
            pattern(MentionableEntityType.TECHNOLOGY, "LOCATED_IN", MentionableEntityType.GEOGRAPHY),
            pattern(MentionableEntityType.TECHNOLOGY, "DESCRIBED_IN", MentionableEntityType.PUBLICATION),
            pattern(MentionableEntityType.TECHNOLOGY, "VALIDATED_BY", MentionableEntityType.EXPERIMENT),
            pattern(MentionableEntityType.TECHNOLOGY, "HAS_ECONOMIC_INDICATOR", MentionableEntityType.ECONOMIC_INDICATOR),
            pattern(MentionableEntityType.PUBLICATION, "AUTHORED_BY", MentionableEntityType.EXPERT),
            pattern(MentionableEntityType.PUBLICATION, "DESCRIBES", MentionableEntityType.PROCESS),
            pattern(MentionableEntityType.PUBLICATION, "DESCRIBES", MentionableEntityType.TECHNOLOGY),
            pattern(MentionableEntityType.PUBLICATION, "DESCRIBES", MentionableEntityType.EXPERIMENT),
            pattern(MentionableEntityType.EXPERT, "EXPERT_IN", MentionableEntityType.PROCESS),
            pattern(MentionableEntityType.EXPERT, "EXPERT_IN", MentionableEntityType.TECHNOLOGY),
            pattern(MentionableEntityType.EXPERT, "AFFILIATED_WITH", MentionableEntityType.TEAM),
            pattern(MentionableEntityType.TEAM, "LOCATED_IN", MentionableEntityType.GEOGRAPHY),
            pattern(MentionableEntityType.FACILITY, "LOCATED_IN", MentionableEntityType.GEOGRAPHY),
            pattern(MentionableEntityType.CONCLUSION, "VALIDATED_BY", MentionableEntityType.PUBLICATION),
            pattern(MentionableEntityType.CONCLUSION, "CONTRADICTS", MentionableEntityType.CONCLUSION),
            pattern(MentionableEntityType.DATA_ISSUE, "RELATED_TO", MentionableEntityType.PROCESS),
            pattern(MentionableEntityType.DATA_ISSUE, "RELATED_TO", MentionableEntityType.TECHNOLOGY),
            pattern(MentionableEntityType.DATA_ISSUE, "RELATED_TO", MentionableEntityType.PUBLICATION)
    );

    public PublishExtractionRequestDto normalize(PublishExtractionRequestDto request) {
        List<ExtractedEntityDto> entities = request.entities() == null
                ? List.of()
                : request.entities();
        Map<String, MentionableEntityType> typesById = entities.stream()
                .collect(Collectors.toMap(
                        ExtractedEntityDto::id,
                        ExtractedEntityDto::type,
                        (left, right) -> left
                ));
        List<ExtractedRelationDto> relations = request.relations() == null
                ? List.of()
                : request.relations();
        List<ExtractedRelationDto> normalizedRelations = relations.stream()
                .map(relation -> normalize(relation, typesById))
                .filter(java.util.Objects::nonNull)
                .toList();

        return new PublishExtractionRequestDto(
                request.documentId(),
                entities,
                normalizedRelations
        );
    }

    public String normalizeAndValidate(
            MentionableEntityType sourceType,
            String relationType,
            MentionableEntityType targetType
    ) {
        String type = normalizeType(relationType);
        if (sourceType == MentionableEntityType.EXPERIMENT
                && targetType == MentionableEntityType.EQUIPMENT
                && "MEASURES".equals(type)) {
            type = "USES_EQUIPMENT";
        }
        if (sourceType == MentionableEntityType.EXPERIMENT && "USES".equals(type)) {
            type = switch (targetType) {
                case MATERIAL -> "USES_MATERIAL";
                case REGIME -> "USES_REGIME";
                case EQUIPMENT -> "USES_EQUIPMENT";
                case PROCESS -> "USES_PROCESS";
                default -> type;
            };
        }
        return ALLOWED.contains(pattern(sourceType, type, targetType)) ? type : null;
    }

    private ExtractedRelationDto normalize(
            ExtractedRelationDto relation,
            Map<String, MentionableEntityType> typesById
    ) {
        MentionableEntityType sourceType = typesById.get(relation.sourceId());
        MentionableEntityType targetType = typesById.get(relation.targetId());
        if (sourceType == null || targetType == null) {
            return null;
        }

        String type = normalizeAndValidate(sourceType, relation.type(), targetType);
        if (type == null) {
            return null;
        }
        return new ExtractedRelationDto(
                relation.id(),
                relation.sourceId(),
                type,
                relation.targetId(),
                relation.source()
        );
    }

    private String normalizeType(String value) {
        String normalized = value == null
                ? ""
                : value.toUpperCase(Locale.ROOT)
                        .replaceAll("[^A-Z0-9]+", "_")
                        .replaceAll("^_+|_+$", "");
        return ALIASES.getOrDefault(normalized, normalized);
    }

    private static RelationPattern pattern(
            MentionableEntityType source,
            String relation,
            MentionableEntityType target
    ) {
        return new RelationPattern(source, relation, target);
    }

    private record RelationPattern(
            MentionableEntityType source,
            String relation,
            MentionableEntityType target
    ) {
    }
}
