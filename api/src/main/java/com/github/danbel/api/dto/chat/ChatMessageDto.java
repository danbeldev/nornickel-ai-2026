package com.github.danbel.api.dto.chat;

import com.github.danbel.api.model.enums.ChatMessageRole;
import com.github.danbel.api.model.enums.ChatMessageStatus;
import com.github.danbel.api.dto.common.ModelTokenUsageDto;

import java.time.OffsetDateTime;
import java.util.List;

public record ChatMessageDto(
        String id,
        ChatMessageRole role,
        String text,
        List<EntityMentionDto> mentions,
        List<ChatCitationDto> citations,
        ChatMessageStatus status,
        String requestId,
        String model,
        Integer promptTokens,
        Integer completionTokens,
        List<ModelTokenUsageDto> tokenUsage,
        Long generationDurationMs,
        ChatEvidenceDto evidence,
        List<ChatStatusEventDto> statusHistory,
        String error,
        OffsetDateTime createdAt
) {
}
