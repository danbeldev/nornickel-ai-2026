package com.github.danbel.api.dto.chat;

public record AskAssistantResponseDto(
        ChatMessageDto message,
        int sourcesFound,
        int experimentsFound
) {
}
