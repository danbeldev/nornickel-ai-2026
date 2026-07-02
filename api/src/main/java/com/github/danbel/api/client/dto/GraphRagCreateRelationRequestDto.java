package com.github.danbel.api.client.dto;

public record GraphRagCreateRelationRequestDto(
        String id,
        String sourceId,
        String targetId,
        String relationType
) {
}
