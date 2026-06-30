package com.github.danbel.api.dto.chat;

import com.github.danbel.api.model.enums.ChatMessageRole;

import java.util.List;

public record ChatMessageDto(
        String id,
        ChatMessageRole role,
        String text,
        List<EntityMentionDto> mentions,
        List<ChatCitationDto> citations
) {
}
