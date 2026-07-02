package com.github.danbel.api.service;

import com.github.danbel.api.model.enums.ChatProcessingStage;

public record QueryPipelineEvent(
        ChatProcessingStage stage,
        String message
) {
}
