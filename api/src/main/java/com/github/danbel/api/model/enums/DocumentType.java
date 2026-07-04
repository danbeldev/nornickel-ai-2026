package com.github.danbel.api.model.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum DocumentType implements JsonEnum {
    PDF("pdf"),
    DOCX("docx"),
    PPTX("pptx"),
    XLSX("xlsx"),
    CSV("csv"),
    HTML("html");

    @JsonValue
    private final String value;

    @JsonCreator
    public static DocumentType fromValue(String value) {
        return JsonEnums.fromValue(DocumentType.class, value);
    }
}
