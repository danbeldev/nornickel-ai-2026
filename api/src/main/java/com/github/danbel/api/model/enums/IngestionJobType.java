package com.github.danbel.api.model.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum IngestionJobType implements JsonEnum {
    DOCUMENT_PROCESSING("document_processing"),
    DOCUMENT_PUBLISH("document_publish");

    @JsonValue
    private final String value;

    @JsonCreator
    public static IngestionJobType fromValue(String value) {
        return JsonEnums.fromValue(IngestionJobType.class, value);
    }
}
