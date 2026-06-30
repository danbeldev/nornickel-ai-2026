package com.github.danbel.api.model.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum DocumentStatus implements JsonEnum {
    READY("ready"),
    PROCESSING("processing"),
    ERROR("error");

    @JsonValue
    private final String value;

    @JsonCreator
    public static DocumentStatus fromValue(String value) {
        return JsonEnums.fromValue(DocumentStatus.class, value);
    }
}
