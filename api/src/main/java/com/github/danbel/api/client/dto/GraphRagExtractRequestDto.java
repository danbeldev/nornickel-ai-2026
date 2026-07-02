package com.github.danbel.api.client.dto;

public record GraphRagExtractRequestDto(
        String documentId,
        String title,
        String type,
        String storageKey,
        String jobId
) {
}
