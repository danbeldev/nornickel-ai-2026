package com.github.danbel.api.dto.graph;

import java.time.OffsetDateTime;

public record KnowledgeEntityVersionDto(
        String id,
        Integer version,
        String changeType,
        String changeMessage,
        String snapshotJson,
        OffsetDateTime changedAt
) {
}
