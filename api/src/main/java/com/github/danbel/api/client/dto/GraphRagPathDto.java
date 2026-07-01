package com.github.danbel.api.client.dto;

public record GraphRagPathDto(
        String sourceId,
        String relationship,
        String targetId
) {
}
