package com.github.danbel.api.dto.common;

public record EntityAttributeDto(
        String name,
        Object value,
        String unit,
        String operator,
        Double numericValue,
        Double minValue,
        Double maxValue,
        String normalizedUnit
) {
    public EntityAttributeDto(String name, Object value, String unit) {
        this(name, value, unit, null, null, null, null, unit);
    }
}
