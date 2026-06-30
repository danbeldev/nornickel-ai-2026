package com.github.danbel.api.dto.chat;

import com.github.danbel.api.model.enums.ChatHistoryGroup;

import java.time.OffsetDateTime;

public record ChatSummaryDto(
        String id,
        String title,
        ChatHistoryGroup group,
        OffsetDateTime date
) {
}
