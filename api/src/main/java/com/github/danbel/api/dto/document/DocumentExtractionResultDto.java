package com.github.danbel.api.dto.document;

import com.github.danbel.api.dto.common.ModelTokenUsageDto;
import java.util.List;

public record DocumentExtractionResultDto(
        String documentId,
        List<ExtractedEntityDto> entities,
        List<ExtractedRelationDto> relations,
        List<VisualFragmentDto> visualFragments,
        List<String> warnings,
        List<ModelTokenUsageDto> tokenUsage
) {
}
