package com.github.danbel.api.dto.common;

public record EntityAttributeDto(
        String name,
        Object value,
        String unit
) {
}
