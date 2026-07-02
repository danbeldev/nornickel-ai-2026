package com.github.danbel.api.service;

import com.github.danbel.api.dto.chat.ChatQueryFiltersDto;

public record QueryPlan(
        String originalQuery,
        String retrievalQuery,
        QueryTransformationType transformation,
        int graphDepth,
        ChatQueryFiltersDto filters,
        ResearchResponseMode responseMode,
        boolean transformed,
        String rejectionReason
) {
}
