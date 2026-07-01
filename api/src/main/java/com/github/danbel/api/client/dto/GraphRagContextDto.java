package com.github.danbel.api.client.dto;

import java.util.List;

public record GraphRagContextDto(
        String chunkId,
        String text,
        String documentId,
        String documentTitle,
        Integer page,
        String section,
        Double score,
        List<String> entityIds,
        List<GraphRagPathDto> graphPaths,
        String source
) {
}
