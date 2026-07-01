package com.github.danbel.api.client.dto;

import com.github.danbel.api.dto.document.PublishExtractionRequestDto;

public record GraphRagPublishRequestDto(
        PublishExtractionRequestDto extraction,
        String title,
        String type,
        String storageKey
) {
}
