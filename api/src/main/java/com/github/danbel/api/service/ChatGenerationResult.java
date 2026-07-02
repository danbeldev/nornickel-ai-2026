package com.github.danbel.api.service;

import com.github.danbel.api.dto.chat.ChatEvidenceDto;

public record ChatGenerationResult(
        String text,
        String model,
        Integer promptTokens,
        Integer completionTokens,
        long durationMs,
        ChatEvidenceDto evidence
) {
}
