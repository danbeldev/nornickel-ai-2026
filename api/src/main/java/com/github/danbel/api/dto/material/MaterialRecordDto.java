package com.github.danbel.api.dto.material;

import java.util.List;

public record MaterialRecordDto(
        String id,
        String name,
        String category,
        String description,
        List<String> aliases,
        List<MaterialCompositionItemDto> composition,
        List<MaterialKeyPropertyDto> keyProperties,
        List<String> experimentIds,
        List<String> documentIds,
        List<String> issueIds
) {
}
