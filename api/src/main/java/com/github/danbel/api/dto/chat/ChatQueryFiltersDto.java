package com.github.danbel.api.dto.chat;

import com.github.danbel.api.model.enums.MentionableEntityType;

import java.util.List;

public record ChatQueryFiltersDto(
        List<MentionableEntityType> entityTypes,
        List<String> countries,
        String geographyScope,
        Integer yearFrom,
        Integer yearTo,
        List<ChatNumericFilterDto> numericConditions
) {
    public boolean active() {
        return !(entityTypes == null || entityTypes.isEmpty())
                || !(countries == null || countries.isEmpty())
                || geographyScope != null
                || yearFrom != null
                || yearTo != null
                || !(numericConditions == null || numericConditions.isEmpty());
    }
}
