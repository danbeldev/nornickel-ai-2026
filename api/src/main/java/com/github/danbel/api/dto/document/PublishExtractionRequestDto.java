package com.github.danbel.api.dto.document;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record PublishExtractionRequestDto(
        @NotBlank String documentId,
        List<ExtractedEntityDto> entities,
        List<ExtractedRelationDto> relations
) {
}
