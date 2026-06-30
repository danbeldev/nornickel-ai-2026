package com.github.danbel.api.service;

import com.github.danbel.api.dto.job.IngestionJobDto;
import com.github.danbel.api.exception.ResourceNotFoundException;
import com.github.danbel.api.mapper.ApiDtoMapper;
import com.github.danbel.api.model.entity.IngestionJobEntity;
import com.github.danbel.api.model.enums.IngestionJobStatus;
import com.github.danbel.api.model.enums.IngestionJobType;
import com.github.danbel.api.repository.IngestionJobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class IngestionJobService {

    private final IngestionJobRepository repository;
    private final ApiDtoMapper mapper;

    public IngestionJobEntity create(String documentId, IngestionJobType type) {
        OffsetDateTime now = OffsetDateTime.now();
        return repository.save(IngestionJobEntity.builder()
                .id("job-" + UUID.randomUUID())
                .documentId(documentId)
                .type(type)
                .status(IngestionJobStatus.QUEUED)
                .progress(0)
                .createdAt(now)
                .updatedAt(now)
                .build());
    }

    public void markRunning(String jobId, int progress) {
        update(jobId, IngestionJobStatus.RUNNING, progress, null);
    }

    public void markReadyForReview(String jobId) {
        update(jobId, IngestionJobStatus.READY_FOR_REVIEW, 100, null);
    }

    public void markPublished(String jobId) {
        update(jobId, IngestionJobStatus.PUBLISHED, 100, null);
    }

    public void markFailed(String jobId, Exception exception) {
        update(jobId, IngestionJobStatus.FAILED, 100, exception.getMessage());
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

    private void update(String jobId, IngestionJobStatus status, int progress, String errorMessage) {
        IngestionJobEntity job = repository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Ingestion job not found: " + jobId));
        job.setStatus(status);
        job.setProgress(progress);
        job.setErrorMessage(errorMessage);
        job.setUpdatedAt(OffsetDateTime.now());
        repository.save(job);
    }
}
