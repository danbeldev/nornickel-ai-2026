package com.github.danbel.api.dto.issue;

import com.github.danbel.api.model.enums.DataIssueSeverity;
import com.github.danbel.api.model.enums.DataIssueType;

import java.time.OffsetDateTime;
import java.util.List;

public record DataIssueRecordDto(
        String id,
        DataIssueType type,
        DataIssueSeverity severity,
        String title,
        String description,
        String recommendation,
        OffsetDateTime detectedAt,
        List<RelatedEntityLinkDto> relatedEntities
) {
}
