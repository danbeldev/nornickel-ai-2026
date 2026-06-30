package com.github.danbel.api.dto.home;

public record DashboardStatDto(
        String id,
        String label,
        String value,
        String detail,
        String icon
) {
}
