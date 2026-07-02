package com.github.danbel.api.dto.graph;

import jakarta.validation.constraints.NotBlank;

public record CreateKnowledgeConnectionRequestDto(
        @NotBlank String sourceId,
        @NotBlank String targetId,
        @NotBlank String relationType,
        String changeMessage
) {
}
