package com.github.danbel.api.model.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum ChatSearchMode implements JsonEnum {
    KNOWLEDGE_BASE("knowledge_base"),
    OPEN_SOURCES("open_sources");

    private final String value;

    ChatSearchMode(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static ChatSearchMode fromValue(String value) {
        return JsonEnums.fromValue(ChatSearchMode.class, value);
    }
}
