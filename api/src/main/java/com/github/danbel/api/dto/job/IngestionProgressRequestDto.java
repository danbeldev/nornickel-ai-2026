package com.github.danbel.api.dto.job;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record IngestionProgressRequestDto(
        @Min(0) @Max(100) int progress,
        @NotBlank String stage
) {
}
