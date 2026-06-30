package com.github.danbel.api.dto.document;

import java.util.List;

public record DocumentExtractionResultDto(
        String documentId,
        List<ExtractedEntityDto> entities,
        List<ExtractedRelationDto> relations,
        List<String> warnings
) {
}
