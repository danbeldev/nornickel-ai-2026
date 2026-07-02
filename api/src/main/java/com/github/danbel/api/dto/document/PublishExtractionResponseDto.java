package com.github.danbel.api.dto.document;

import java.util.List;

public record PublishExtractionResponseDto(
        String documentId,
        List<String> publishedEntityIds,
        List<String> publishedRelationIds,
        String jobId
) {
}
