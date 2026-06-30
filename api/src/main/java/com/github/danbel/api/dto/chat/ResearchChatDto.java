package com.github.danbel.api.dto.chat;

import com.github.danbel.api.model.enums.ChatHistoryGroup;

import java.time.OffsetDateTime;
import java.util.List;

public record ResearchChatDto(
        String id,
        String title,
        ChatHistoryGroup group,
        OffsetDateTime date,
        List<ChatMessageDto> messages
) {
}
