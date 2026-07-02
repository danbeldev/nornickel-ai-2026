package com.github.danbel.api.client.dto;

import com.github.danbel.api.model.enums.MentionableEntityType;

public record GraphRagRecommendationDto(
        String id,
        MentionableEntityType type,
        String label,
        String reason
) {
}
