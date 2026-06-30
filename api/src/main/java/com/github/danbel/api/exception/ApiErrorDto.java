package com.github.danbel.api.exception;

import java.time.OffsetDateTime;

public record ApiErrorDto(
        String message,
        String path,
        String correlationId,
        OffsetDateTime timestamp
) {
}
