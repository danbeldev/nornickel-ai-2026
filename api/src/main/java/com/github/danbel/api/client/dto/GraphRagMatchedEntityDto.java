package com.github.danbel.api.client.dto;

import com.github.danbel.api.model.enums.MentionableEntityType;

public record GraphRagMatchedEntityDto(
        String id,
        MentionableEntityType type,
        String label,
        String description,
        Double confidence,
        String verificationStatus,
        String geography,
        Integer publicationYear
) {
}
