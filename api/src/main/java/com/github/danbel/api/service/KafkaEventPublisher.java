package com.github.danbel.api.service;

import com.github.danbel.api.config.AppProperties;
import com.github.danbel.api.event.DocumentProcessingRequestedEvent;
import com.github.danbel.api.event.DocumentPublishRequestedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class KafkaEventPublisher {

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final AppProperties properties;

    public void publishDocumentProcessing(DocumentProcessingRequestedEvent event) {
        try {
            kafkaTemplate.send(properties.getKafka().getTopics().getDocumentProcessingRequested(), event.documentId(), event);
        } catch (Exception exception) {
            log.warn("Cannot publish document processing event, continuing with local flow: {}", exception.getMessage());
        }
    }

    public void publishDocumentPublish(DocumentPublishRequestedEvent event) {
        try {
            kafkaTemplate.send(properties.getKafka().getTopics().getDocumentPublishRequested(), event.documentId(), event);
        } catch (Exception exception) {
            log.warn("Cannot publish document publish event, continuing with local flow: {}", exception.getMessage());
        }
    }
}
