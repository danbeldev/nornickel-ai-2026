package com.github.danbel.api.dto.issue;

import com.github.danbel.api.model.enums.MentionableEntityType;

public record RelatedEntityLinkDto(
        String id,
        String label,
        MentionableEntityType entityType
) {
}
