package com.github.danbel.api.model.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum DataIssueType implements JsonEnum {
    MISSING_DATA("missing_data"),
    CONFLICT("conflict"),
    UNIT_MISMATCH("unit_mismatch"),
    UNEXPLORED_RANGE("unexplored_range"),
    WEAK_EVIDENCE("weak_evidence"),
    GEOGRAPHY_GAP("geography_gap"),
    UNVALIDATED_TECHNOLOGY("unvalidated_technology"),
    STALE_KNOWLEDGE("stale_knowledge");

    @JsonValue
    private final String value;

    @JsonCreator
    public static DataIssueType fromValue(String value) {
        return JsonEnums.fromValue(DataIssueType.class, value);
    }
}
