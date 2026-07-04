package com.github.danbel.api.dto.chat;

import com.github.danbel.api.model.enums.ChatSearchMode;
import com.github.danbel.api.model.enums.ChatReasoningMode;
import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record AskAssistantRequestDto(
        @NotBlank String requestId,
        @NotBlank String text,
        List<EntityMentionDto> mentions,
        ChatSearchMode searchMode,
        ChatReasoningMode reasoningMode
) {
}
