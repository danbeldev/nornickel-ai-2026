package com.github.danbel.api.dto.job;

import com.github.danbel.api.model.enums.IngestionJobStatus;
import com.github.danbel.api.model.enums.IngestionJobType;

import java.time.OffsetDateTime;

public record IngestionJobDto(
        String id,
        String documentId,
        IngestionJobType type,
        IngestionJobStatus status,
        Integer progress,
        String stage,
        String errorMessage,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
