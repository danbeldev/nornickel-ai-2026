package com.github.danbel.api.model.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum IngestionJobStatus implements JsonEnum {
    QUEUED("queued"),
    RUNNING("running"),
    READY_FOR_REVIEW("ready_for_review"),
    PUBLISHED("published"),
    CANCELED("canceled"),
    FAILED("failed");

    @JsonValue
    private final String value;

    @JsonCreator
    public static IngestionJobStatus fromValue(String value) {
        return JsonEnums.fromValue(IngestionJobStatus.class, value);
    }
}
