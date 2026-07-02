package com.github.danbel.api.client.dto;

import java.util.List;

public record GraphRagDataIssueRequestDto(
        String id,
        String title,
        String description,
        String issueType,
        String severity,
        String recommendation,
        List<String> relatedEntityIds
) {
}
