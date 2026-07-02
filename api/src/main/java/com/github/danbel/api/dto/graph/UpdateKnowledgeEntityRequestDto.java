package com.github.danbel.api.dto.graph;

import com.github.danbel.api.dto.common.EntityAttributeDto;
import com.github.danbel.api.model.enums.MentionableEntityType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import java.util.List;

public record UpdateKnowledgeEntityRequestDto(
        @NotNull MentionableEntityType type,
        @NotBlank String title,
        @NotBlank String description,
        List<EntityAttributeDto> attributes,
        @DecimalMin("0.0") @DecimalMax("1.0") Double confidence,
        String verificationStatus,
        String geography,
        @Min(1800) @Max(2100) Integer publicationYear,
        String language,
        String changeMessage
) {
}
