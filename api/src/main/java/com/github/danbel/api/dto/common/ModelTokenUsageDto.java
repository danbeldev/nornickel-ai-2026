package com.github.danbel.api.dto.common;

public record ModelTokenUsageDto(
        String model,
        Integer promptTokens,
        Integer completionTokens,
        Integer totalTokens
) {
}
