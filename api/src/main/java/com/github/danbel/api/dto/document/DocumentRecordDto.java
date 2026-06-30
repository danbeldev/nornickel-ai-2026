package com.github.danbel.api.dto.document;

import com.github.danbel.api.model.enums.DocumentStatus;
import com.github.danbel.api.model.enums.DocumentType;

import java.time.OffsetDateTime;
import java.util.List;

public record DocumentRecordDto(
        String id,
        String title,
        DocumentType type,
        Integer year,
        String author,
        String description,
        Integer pages,
        DocumentStatus status,
        OffsetDateTime indexedAt,
        Integer extractedEntities,
        List<String> experimentIds,
        List<String> materialIds,
        List<String> issueIds
) {
}
