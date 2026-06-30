package com.github.danbel.api.dto.document;

import com.github.danbel.api.dto.common.EntityAttributeDto;
import com.github.danbel.api.dto.common.SourceReferenceDto;
import com.github.danbel.api.model.enums.MentionableEntityType;

import java.util.List;

public record ExtractedEntityDto(
        String id,
        MentionableEntityType type,
        String name,
        List<EntityAttributeDto> attributes,
        SourceReferenceDto source
) {
}
