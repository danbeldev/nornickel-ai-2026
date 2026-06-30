package com.github.danbel.api.dto.graph;

import com.github.danbel.api.dto.common.EntityAttributeDto;
import com.github.danbel.api.dto.common.SourceReferenceDto;
import com.github.danbel.api.model.enums.MentionableEntityType;

import java.util.List;

public record KnowledgeGraphEntityDto(
        String id,
        MentionableEntityType type,
        String title,
        String subtitle,
        String description,
        GraphPositionDto position,
        List<EntityAttributeDto> attributes,
        List<SourceReferenceDto> sources
) {
}
