package com.github.danbel.api.dto.document;

import com.github.danbel.api.dto.common.SourceReferenceDto;

public record ExtractedRelationDto(
        String id,
        String sourceId,
        String type,
        String targetId,
        SourceReferenceDto source
) {
}
