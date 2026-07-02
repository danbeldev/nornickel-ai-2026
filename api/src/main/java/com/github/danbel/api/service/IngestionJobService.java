package com.github.danbel.api.service;

import com.github.danbel.api.dto.job.IngestionJobDto;
import com.github.danbel.api.exception.ResourceNotFoundException;
import com.github.danbel.api.mapper.ApiDtoMapper;
import com.github.danbel.api.model.entity.IngestionJobEntity;
import com.github.danbel.api.model.enums.IngestionJobStatus;
import com.github.danbel.api.model.enums.IngestionJobType;
import com.github.danbel.api.model.enums.DocumentStatus;
import com.github.danbel.api.repository.DocumentRepository;
import com.github.danbel.api.repository.IngestionJobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class IngestionJobService {

    private final IngestionJobRepository repository;
    private final DocumentRepository documentRepository;
    private final ApiDtoMapper mapper;
    private final GraphRagGateway graphRagGateway;

    public IngestionJobEntity create(String documentId, IngestionJobType type) {
        OffsetDateTime now = OffsetDateTime.now();
        return repository.save(IngestionJobEntity.builder()
                .id("job-" + UUID.randomUUID())
                .documentId(documentId)
                .type(type)
                .status(IngestionJobStatus.QUEUED)
                .progress(0)
                .stage("Ожидает запуска фоновой обработки")
                .createdAt(now)
                .updatedAt(now)
                .build());
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markRunning(String jobId, int progress, String stage) {
        update(jobId, IngestionJobStatus.RUNNING, progress, stage, null);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markReadyForReview(String jobId) {
        update(jobId, IngestionJobStatus.READY_FOR_REVIEW, 100, "Черновик готов к проверке", null);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markPublished(String jobId) {
        update(jobId, IngestionJobStatus.PUBLISHED, 100, "Данные опубликованы в графе знаний", null);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markFailed(String jobId, Exception exception) {
        update(jobId, IngestionJobStatus.FAILED, 100, "Обработка завершилась ошибкой", exception.getMessage());
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void updateProgress(String jobId, int progress, String stage) {
        IngestionJobEntity job = repository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Ingestion job not found: " + jobId));
        if (isTerminal(job.getStatus())) {
            return;
        }
        job.setStatus(IngestionJobStatus.RUNNING);
        job.setProgress(Math.max(job.getProgress(), Math.min(progress, 99)));
        job.setStage(stage);
        job.setUpdatedAt(OffsetDateTime.now());
        repository.save(job);
    }

    public IngestionJobDto cancel(String jobId) {
        IngestionJobEntity job = repository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Ingestion job not found: " + jobId));
        boolean wasRunning = job.getStatus() == IngestionJobStatus.RUNNING;
        boolean canceledNow = false;
        if (!isTerminal(job.getStatus())) {
            job.setStatus(IngestionJobStatus.CANCELED);
            job.setStage("Обработка отменена пользователем");
            job.setUpdatedAt(OffsetDateTime.now());
            repository.save(job);
            documentRepository.findById(job.getDocumentId()).ifPresent(document -> {
                document.setStatus(DocumentStatus.CANCELED);
                documentRepository.save(document);
            });
            canceledNow = true;
        }
        if (canceledNow && wasRunning && job.getType() == IngestionJobType.DOCUMENT_PROCESSING) {
            graphRagGateway.cancel(jobId);
        }
        return mapper.toJob(job);
    }

    public boolean isCanceled(String jobId) {
        return repository.findById(jobId)
                .map(job -> job.getStatus() == IngestionJobStatus.CANCELED)
                .orElse(false);
    }

    public List<IngestionJobDto> getDocumentJobs(String documentId) {
        return repository.findByDocumentIdOrderByCreatedAtDesc(documentId).stream()
                .map(mapper::toJob)
                .toList();
    }

    public IngestionJobDto getJob(String jobId) {
        return repository.findById(jobId)
                .map(mapper::toJob)
                .orElseThrow(() -> new ResourceNotFoundException("Ingestion job not found: " + jobId));
    }

    private void update(
            String jobId,
            IngestionJobStatus status,
            int progress,
            String stage,
            String errorMessage
    ) {
        IngestionJobEntity job = repository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Ingestion job not found: " + jobId));
        if (job.getStatus() == IngestionJobStatus.CANCELED) {
            return;
        }
        job.setStatus(status);
        job.setProgress(progress);
        job.setStage(stage);
        job.setErrorMessage(errorMessage);
        job.setUpdatedAt(OffsetDateTime.now());
        repository.save(job);
    }

    private boolean isTerminal(IngestionJobStatus status) {
        return status == IngestionJobStatus.READY_FOR_REVIEW
                || status == IngestionJobStatus.PUBLISHED
                || status == IngestionJobStatus.FAILED
                || status == IngestionJobStatus.CANCELED;
    }
}
