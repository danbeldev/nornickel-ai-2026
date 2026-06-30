package com.github.danbel.api.event;

import java.time.OffsetDateTime;

public record DocumentProcessingRequestedEvent(
        String jobId,
        String documentId,
        OffsetDateTime requestedAt
) {
}
