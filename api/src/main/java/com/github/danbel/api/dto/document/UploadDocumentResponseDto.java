package com.github.danbel.api.dto.document;

public record UploadDocumentResponseDto(
        DocumentRecordDto document,
        DocumentExtractionResultDto extraction,
        String jobId
) {
}
