package com.github.danbel.api.event;

import java.time.OffsetDateTime;

public record DocumentPublishRequestedEvent(
        String jobId,
        String documentId,
        OffsetDateTime requestedAt
) {
}
