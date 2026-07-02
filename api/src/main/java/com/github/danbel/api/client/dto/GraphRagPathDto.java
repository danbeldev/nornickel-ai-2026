package com.github.danbel.api.client.dto;

import com.github.danbel.api.model.enums.MentionableEntityType;

public record GraphRagPathDto(
        String sourceId,
        String sourceLabel,
        MentionableEntityType sourceType,
        String relationship,
        String targetId,
        String targetLabel,
        MentionableEntityType targetType
) {
}
