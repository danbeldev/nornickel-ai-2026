package com.github.danbel.api.model.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ChatMessageRole implements JsonEnum {
    USER("user"),
    ASSISTANT("assistant");

    @JsonValue
    private final String value;

    @JsonCreator
    public static ChatMessageRole fromValue(String value) {
        return JsonEnums.fromValue(ChatMessageRole.class, value);
    }
}
