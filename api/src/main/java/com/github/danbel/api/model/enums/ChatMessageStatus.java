package com.github.danbel.api.model.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ChatMessageStatus implements JsonEnum {
    STREAMING("streaming"),
    COMPLETED("completed"),
    FAILED("failed"),
    INTERRUPTED("interrupted");

    @JsonValue
    private final String value;

    @JsonCreator
    public static ChatMessageStatus fromValue(String value) {
        return JsonEnums.fromValue(ChatMessageStatus.class, value);
    }
}
