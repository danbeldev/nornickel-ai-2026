package com.github.danbel.api.client.dto;

import com.github.danbel.api.dto.chat.ChatCitationDto;

import java.util.List;

public record GraphRagRetrieveResponseDto(
        String answerHint,
        List<ChatCitationDto> citations,
        int sourcesFound,
        int experimentsFound,
        List<String> contextChunks
) {
}
