package com.github.danbel.api.client.dto;

import com.github.danbel.api.dto.chat.EntityMentionDto;

import java.util.List;

public record GraphRagRetrieveRequestDto(
        String query,
        List<EntityMentionDto> mentions
) {
}
