package com.github.danbel.api.model.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum ChatProcessingStage implements JsonEnum {
    REQUEST_RECEIVED("request_received"),
    CLASSIFYING_QUERY("classifying_query"),
    QUERY_CLASSIFIED("query_classified"),
    COMPRESSING_QUERY("compressing_query"),
    REWRITING_QUERY("rewriting_query"),
    VALIDATING_QUERY("validating_query"),
    TRANSFORMATION_REJECTED("transformation_rejected"),
    QUERY_READY("query_ready"),
    RETRIEVING_KNOWLEDGE("retrieving_knowledge"),
    KNOWLEDGE_RETRIEVED("knowledge_retrieved"),
    GENERATING_RESPONSE("generating_response"),
    RESPONSE_COMPLETED("response_completed"),
    FAILED("failed"),
    INTERRUPTED("interrupted");

    private final String value;

    ChatProcessingStage(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static ChatProcessingStage fromValue(String value) {
        return JsonEnums.fromValue(ChatProcessingStage.class, value);
    }
}
