package com.github.danbel.api.dto.chat;

import java.util.List;

public record ChatStreamEventDto(
        String type,
        String messageId,
        String delta,
        ChatMessageDto message,
        List<ChatCitationDto> citations,
        ChatEvidenceDto evidence,
        ChatStatusEventDto statusEvent,
        String error
) {
}
