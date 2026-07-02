package com.github.danbel.api.dto.chat;

import com.github.danbel.api.client.dto.GraphRagContextDto;
import com.github.danbel.api.client.dto.GraphRagMatchedEntityDto;
import com.github.danbel.api.client.dto.GraphRagPathDto;
import com.github.danbel.api.client.dto.GraphRagRecommendationDto;

import java.util.List;

public record ChatEvidenceDto(
        String originalQuery,
        String retrievalQuery,
        String transformation,
        Integer graphDepth,
        ChatQueryFiltersDto filters,
        String responseMode,
        String systemPrompt,
        String userPrompt,
        List<GraphRagContextDto> contexts,
        List<GraphRagMatchedEntityDto> entities,
        List<GraphRagPathDto> paths,
        List<GraphRagRecommendationDto> recommendations
) {
}
