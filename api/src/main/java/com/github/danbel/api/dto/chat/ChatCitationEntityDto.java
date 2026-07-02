package com.github.danbel.api.dto.chat;

import com.github.danbel.api.model.enums.MentionableEntityType;

public record ChatCitationEntityDto(
        String id,
        MentionableEntityType type,
        String label,
        String description
) {
}
