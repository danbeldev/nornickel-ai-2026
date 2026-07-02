package com.github.danbel.api.client.dto;

import com.github.danbel.api.dto.common.EntityAttributeDto;
import com.github.danbel.api.model.enums.MentionableEntityType;

import java.util.List;

public record GraphRagUpdateEntityRequestDto(
        String id,
        MentionableEntityType type,
        String name,
        String description,
        List<EntityAttributeDto> attributes,
        Double confidence,
        String verificationStatus,
        String geography,
        Integer publicationYear,
        String language
) {
}
