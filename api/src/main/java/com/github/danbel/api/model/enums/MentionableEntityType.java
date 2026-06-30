package com.github.danbel.api.model.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum MentionableEntityType implements JsonEnum {
    MATERIAL("material"),
    EXPERIMENT("experiment"),
    DOCUMENT("document"),
    DATA_ISSUE("data_issue"),
    PROPERTY("property"),
    REGIME("regime"),
    EQUIPMENT("equipment"),
    TEAM("team"),
    CONCLUSION("conclusion"),
    UNCLASSIFIED("unclassified");

    @JsonValue
    private final String value;

    @JsonCreator
    public static MentionableEntityType fromValue(String value) {
        return JsonEnums.fromValue(MentionableEntityType.class, value);
    }
}
