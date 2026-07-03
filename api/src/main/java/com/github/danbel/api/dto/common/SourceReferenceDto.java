package com.github.danbel.api.dto.common;

public record SourceReferenceDto(
        String documentId,
        Integer page,
        String chunkId,
        String section,
        String quote
) {
}
