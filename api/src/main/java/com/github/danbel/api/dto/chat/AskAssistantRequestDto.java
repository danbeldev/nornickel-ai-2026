package com.github.danbel.api.dto.chat;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record AskAssistantRequestDto(
        String chatId,
        @NotBlank String text,
        List<EntityMentionDto> mentions
) {
}
