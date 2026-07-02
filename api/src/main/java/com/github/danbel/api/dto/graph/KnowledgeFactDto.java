package com.github.danbel.api.dto.graph;

public record KnowledgeFactDto(
        String id,
        String name,
        String operator,
        Double numericValue,
        Double minValue,
        Double maxValue,
        String unit,
        String normalizedUnit,
        String textValue,
        String sourceDocumentId,
        Integer sourcePage,
        Double confidence
) {
}
