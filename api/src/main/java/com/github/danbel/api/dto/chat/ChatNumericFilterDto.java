package com.github.danbel.api.dto.chat;

public record ChatNumericFilterDto(
        String parameter,
        String operator,
        Double value,
        Double minValue,
        Double maxValue,
        String unit
) {
}
