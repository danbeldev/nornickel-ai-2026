package com.github.danbel.api.dto.document;

public record VisualFragmentDto(
        String id,
        String type,
        Integer page,
        String section,
        String title,
        String description,
        String structuredData,
        Double confidence,
        boolean estimated,
        String storageKey,
        String contentType
) {
}
