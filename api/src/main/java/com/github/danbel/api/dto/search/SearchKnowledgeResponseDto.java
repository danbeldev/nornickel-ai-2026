package com.github.danbel.api.dto.search;

public record SearchKnowledgeResponseDto(
        String query,
        int experimentsFound,
        int documentsFound
) {
}
