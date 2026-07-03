package com.github.danbel.api.dto.chat;

public record WebSearchSourceDto(
        String id,
        String title,
        String url,
        String publishedAt,
        String quote,
        String content
) {
}
