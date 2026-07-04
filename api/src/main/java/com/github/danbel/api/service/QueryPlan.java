package com.github.danbel.api.service;

import com.github.danbel.api.dto.chat.ChatQueryFiltersDto;
import com.github.danbel.api.dto.common.ModelTokenUsageDto;
import com.github.danbel.api.model.enums.ChatReasoningMode;

import java.util.List;

public record QueryPlan(
        String originalQuery,
        String retrievalQuery,
        ChatReasoningMode reasoningMode,
        QueryTransformationType transformation,
        int graphDepth,
        ChatQueryFiltersDto filters,
        ResearchResponseMode responseMode,
        boolean compactFactLookup,
        boolean transformed,
        String rejectionReason,
        List<ModelTokenUsageDto> tokenUsage
) {
}
