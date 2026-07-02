package com.github.danbel.api.dto.graph;

import jakarta.validation.constraints.NotBlank;

public record UpdateKnowledgeConnectionRequestDto(
        @NotBlank String relationType,
        String changeMessage
) {
}
