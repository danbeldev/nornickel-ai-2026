package com.github.danbel.api.dto.graph;

import java.util.List;

public record KnowledgeGraphDataDto(
        List<KnowledgeGraphEntityDto> entities,
        List<KnowledgeGraphConnectionDto> connections
) {
}
