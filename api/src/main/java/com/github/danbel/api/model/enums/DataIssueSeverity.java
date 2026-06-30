package com.github.danbel.api.model.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum DataIssueSeverity implements JsonEnum {
    HIGH("high"),
    MEDIUM("medium"),
    LOW("low");

    @JsonValue
    private final String value;

    @JsonCreator
    public static DataIssueSeverity fromValue(String value) {
        return JsonEnums.fromValue(DataIssueSeverity.class, value);
    }
}
