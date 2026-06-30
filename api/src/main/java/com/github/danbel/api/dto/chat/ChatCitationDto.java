package com.github.danbel.api.dto.chat;

import com.github.danbel.api.model.enums.MentionableEntityType;

public record ChatCitationDto(
        String id,
        String entityId,
        MentionableEntityType entityType,
        String label,
        String description,
        Integer page
) {
}
