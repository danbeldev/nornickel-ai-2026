package com.github.danbel.api.service;

import com.github.danbel.api.event.DocumentProcessingRequestedEvent;
import com.github.danbel.api.event.DocumentPublishRequestedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class DocumentIngestionListener {

    private final DocumentService documentService;

    @KafkaListener(topics = "${app.kafka.topics.document-processing-requested}")
    public void onDocumentProcessingRequested(DocumentProcessingRequestedEvent event) {
        log.info("Document processing requested: documentId={}, jobId={}", event.documentId(), event.jobId());
        documentService.processDocument(event.documentId(), event.jobId());
    }

    @KafkaListener(topics = "${app.kafka.topics.document-publish-requested}")
    public void onDocumentPublishRequested(DocumentPublishRequestedEvent event) {
        log.info("Document publish requested: documentId={}, jobId={}", event.documentId(), event.jobId());
        documentService.publishStoredDraft(event.documentId(), event.jobId());
    }
}
