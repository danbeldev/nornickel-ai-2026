package com.github.danbel.api.client.dto;

import com.github.danbel.api.dto.chat.ChatCitationDto;

import java.util.List;

public record GraphRagRetrieveResponseDto(
        String retrievalStatus,
        String answerHint,
        List<ChatCitationDto> citations,
        int sourcesFound,
        int experimentsFound,
        List<String> contextChunks,
        List<GraphRagContextDto> contexts,
        List<GraphRagMatchedEntityDto> matchedEntities,
        List<GraphRagPathDto> graphPaths,
        List<GraphRagRecommendationDto> recommendations
) {
}
