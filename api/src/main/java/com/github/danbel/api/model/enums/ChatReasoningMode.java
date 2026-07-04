package com.github.danbel.api.model.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum ChatReasoningMode implements JsonEnum {
    AUTO("auto"),
    NORMAL("normal"),
    RESEARCH("research");

    private final String value;

    ChatReasoningMode(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static ChatReasoningMode fromValue(String value) {
        return JsonEnums.fromValue(ChatReasoningMode.class, value);
    }
}
