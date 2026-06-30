package com.github.danbel.api.controller;

import com.github.danbel.api.dto.document.DocumentExtractionResultDto;
import com.github.danbel.api.dto.document.DocumentRecordDto;
import com.github.danbel.api.dto.document.PublishExtractionRequestDto;
import com.github.danbel.api.dto.document.PublishExtractionResponseDto;
import com.github.danbel.api.dto.document.UploadDocumentResponseDto;
import com.github.danbel.api.dto.job.IngestionJobDto;
import com.github.danbel.api.service.DocumentService;
import com.github.danbel.api.service.IngestionJobService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/documents")
public class DocumentController {

    private final DocumentService documentService;
    private final IngestionJobService jobService;

    @GetMapping
    public List<DocumentRecordDto> getDocuments() {
        return documentService.getDocuments();
    }

    @GetMapping("/recent")
    public List<DocumentRecordDto> getRecentDocuments(@RequestParam(defaultValue = "5") int limit) {
        return documentService.getRecentDocuments(limit);
    }

    @GetMapping("/{documentId}")
    public DocumentRecordDto getDocument(@PathVariable String documentId) {
        return documentService.getDocument(documentId);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UploadDocumentResponseDto uploadDocument(@RequestPart("file") MultipartFile file) {
        return documentService.uploadDocument(file);
    }

    @PostMapping(path = "/enqueue", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public DocumentRecordDto enqueueDocument(@RequestPart("file") MultipartFile file) {
        return documentService.enqueueDocument(file);
    }

    @GetMapping("/{documentId}/extraction")
    public DocumentExtractionResultDto getExtractionDraft(@PathVariable String documentId) {
        return documentService.getExtractionDraft(documentId);
    }

    @PostMapping("/{documentId}/publish")
    public PublishExtractionResponseDto publishExtraction(
            @PathVariable String documentId,
            @Valid @RequestBody PublishExtractionRequestDto request
    ) {
        if (!documentId.equals(request.documentId())) {
            throw new IllegalArgumentException("Path documentId must match request documentId");
        }
        return documentService.publishExtraction(request);
    }

    @GetMapping("/{documentId}/jobs")
    public List<IngestionJobDto> getDocumentJobs(@PathVariable String documentId) {
        return jobService.getDocumentJobs(documentId);
    }
}
