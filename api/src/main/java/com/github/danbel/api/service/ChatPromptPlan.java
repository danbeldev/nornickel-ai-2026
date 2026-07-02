package com.github.danbel.api.service;

import com.github.danbel.api.dto.chat.ChatEvidenceDto;

public record ChatPromptPlan(
        String systemPrompt,
        String userPrompt,
        ChatEvidenceDto evidence
) {
}
