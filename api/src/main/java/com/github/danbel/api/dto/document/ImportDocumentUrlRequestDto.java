package com.github.danbel.api.dto.document;

import jakarta.validation.constraints.NotBlank;

public record ImportDocumentUrlRequestDto(
        @NotBlank String url
) {
}
