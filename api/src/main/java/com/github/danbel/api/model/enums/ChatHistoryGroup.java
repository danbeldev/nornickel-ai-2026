package com.github.danbel.api.model.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ChatHistoryGroup implements JsonEnum {
    TODAY("today"),
    YESTERDAY("yesterday"),
    EARLIER("earlier");

    @JsonValue
    private final String value;

    @JsonCreator
    public static ChatHistoryGroup fromValue(String value) {
        return JsonEnums.fromValue(ChatHistoryGroup.class, value);
    }
}
