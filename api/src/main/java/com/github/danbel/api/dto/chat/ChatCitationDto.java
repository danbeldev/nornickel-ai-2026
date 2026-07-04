package com.github.danbel.api.dto.chat;

import com.github.danbel.api.model.enums.MentionableEntityType;

import java.util.List;

public record ChatCitationDto(
        String id,
        String entityId,
        MentionableEntityType entityType,
        String label,
        String description,
        Integer page,
        List<ChatCitationEntityDto> relatedEntities,
        String sourceKind,
        String url,
        String publishedAt,
        String quote,
        String visualId,
        String visualType
) {
}
