package com.github.danbel.api.dto.home;

import java.util.List;

public record HomePageDataDto(
        List<DashboardStatDto> stats,
        List<String> exampleQueries
) {
}
