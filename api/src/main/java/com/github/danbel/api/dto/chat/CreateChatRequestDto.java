package com.github.danbel.api.dto.chat;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record CreateChatRequestDto(
        @NotBlank String text,
        List<EntityMentionDto> mentions
) {
}
