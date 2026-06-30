package com.github.danbel.api.dto.entity;

import com.github.danbel.api.model.enums.MentionableEntityType;

public record MentionableEntityDto(
        String id,
        MentionableEntityType type,
        String label,
        String subtitle
) {
}
