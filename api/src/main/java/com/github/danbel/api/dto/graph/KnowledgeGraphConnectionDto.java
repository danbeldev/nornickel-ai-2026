package com.github.danbel.api.dto.graph;

public record KnowledgeGraphConnectionDto(
        String id,
        String source,
        String target,
        String label
) {
}
