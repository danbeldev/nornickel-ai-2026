package com.github.danbel.api.dto.chat;

import com.github.danbel.api.model.enums.ChatProcessingStage;

import java.time.OffsetDateTime;

public record ChatStatusEventDto(
        ChatProcessingStage stage,
        OffsetDateTime timestamp,
        String message
) {
}
