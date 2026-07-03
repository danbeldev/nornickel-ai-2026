package com.github.danbel.api.dto.entity;

import java.util.List;

public record MentionableEntityPageDto(
        List<MentionableEntityDto> items,
        int page,
        int size,
        long totalElements,
        int totalPages
) {
}
