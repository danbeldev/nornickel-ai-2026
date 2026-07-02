package com.github.danbel.api.service;

import com.github.danbel.api.config.AppProperties;
import com.github.danbel.api.event.DocumentProcessingRequestedEvent;
import com.github.danbel.api.event.DocumentPublishRequestedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.concurrent.CompletableFuture;
import java.util.function.Supplier;

@Slf4j
@Service
@RequiredArgsConstructor
public class KafkaEventPublisher {

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final AppProperties properties;
    private final IngestionJobService jobService;

    public void publishDocumentProcessing(DocumentProcessingRequestedEvent event) {
        publishAfterCommit(
                "document processing",
                event.jobId(),
                () -> kafkaTemplate.send(
                        properties.getKafka().getTopics().getDocumentProcessingRequested(),
                        event.documentId(),
                        event
                )
        );
    }

    public void publishDocumentPublish(DocumentPublishRequestedEvent event) {
        publishAfterCommit(
                "document publication",
                event.jobId(),
                () -> kafkaTemplate.send(
                        properties.getKafka().getTopics().getDocumentPublishRequested(),
                        event.documentId(),
                        event
                )
        );
    }

    private void publishAfterCommit(
            String operation,
            String jobId,
            Supplier<CompletableFuture<?>> send
    ) {
        Runnable publish = () -> {
            try {
                send.get().whenComplete((result, exception) -> {
                    if (exception != null) {
                        log.error("Cannot enqueue {} event: {}", operation, exception.getMessage(), exception);
                        jobService.markFailed(jobId, asException(exception));
                    }
                });
            } catch (Exception exception) {
                log.error("Cannot enqueue {} event: {}", operation, exception.getMessage(), exception);
                jobService.markFailed(jobId, exception);
            }
        };

        if (!TransactionSynchronizationManager.isActualTransactionActive()) {
            publish.run();
            return;
        }

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                publish.run();
            }
        });
    }

    private Exception asException(Throwable throwable) {
        return throwable instanceof Exception exception
                ? exception
                : new IllegalStateException(throwable);
    }
}
