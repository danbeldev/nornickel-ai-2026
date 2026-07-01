package com.github.danbel.api.service;

public record ChatGenerationResult(
        String text,
        String model,
        Integer promptTokens,
        Integer completionTokens,
        long durationMs
) {
}
