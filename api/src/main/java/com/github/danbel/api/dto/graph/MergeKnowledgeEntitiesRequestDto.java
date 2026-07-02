package com.github.danbel.api.dto.graph;

import jakarta.validation.constraints.NotBlank;

public record MergeKnowledgeEntitiesRequestDto(
        @NotBlank String targetEntityId,
        String changeMessage
) {
}
