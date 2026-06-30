package com.github.danbel.api.exception;

import java.time.OffsetDateTime;

public record ApiErrorDto(
        String message,
        String path,
        OffsetDateTime timestamp
) {
}
