package com.github.danbel.api.service;

import com.github.danbel.api.client.GraphRagClient;
import com.github.danbel.api.client.dto.GraphRagExtractRequestDto;
import com.github.danbel.api.client.dto.GraphRagPublishRequestDto;
import com.github.danbel.api.client.dto.GraphRagPublishResponseDto;
import com.github.danbel.api.client.dto.GraphRagRetrieveRequestDto;
import com.github.danbel.api.client.dto.GraphRagRetrieveResponseDto;
import com.github.danbel.api.dto.chat.EntityMentionDto;
import com.github.danbel.api.dto.document.DocumentExtractionResultDto;
import com.github.danbel.api.dto.document.PublishExtractionRequestDto;
import com.github.danbel.api.dto.document.PublishExtractionResponseDto;
import com.github.danbel.api.model.entity.DocumentEntity;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class GraphRagGateway {

    private final GraphRagClient client;

    public GraphRagRetrieveResponseDto retrieve(
            String query,
            List<EntityMentionDto> mentions,
            int graphDepth
    ) {
        List<EntityMentionDto> safeMentions = mentions == null ? List.of() : mentions;
        try {
            return client.retrieve(new GraphRagRetrieveRequestDto(
                    query,
                    safeMentions,
                    Math.max(1, Math.min(graphDepth, 2))
            ));
        } catch (Exception exception) {
            log.warn("GraphRAG retrieval is unavailable: {}", exception.getMessage());
            return new GraphRagRetrieveResponseDto(
                    "unavailable",
                    "Внутренняя база знаний временно недоступна.",
                    List.of(),
                    0,
                    0,
                    List.of(),
                    List.of(),
                    List.of(),
                    List.of()
            );
        }
    }

    public DocumentExtractionResultDto extract(DocumentEntity document, String jobId) {
        try {
            return client.extract(new GraphRagExtractRequestDto(
                    document.getId(),
                    document.getTitle(),
                    document.getType().getValue(),
                    document.getStorageKey(),
                    jobId
            ));
        } catch (Exception exception) {
            throw new IllegalStateException(
                    "GraphRAG could not extract document " + document.getId(),
                    exception
            );
        }
    }

    public void cancel(String jobId) {
        try {
            client.cancel(jobId);
        } catch (Exception exception) {
            log.warn("GraphRAG cancellation request failed for job {}: {}", jobId, exception.getMessage());
        }
    }

    public PublishExtractionResponseDto publish(
            DocumentEntity document,
            PublishExtractionRequestDto request
    ) {
        try {
            GraphRagPublishResponseDto response = client.publish(new GraphRagPublishRequestDto(
                    request,
                    document.getTitle(),
                    document.getType().getValue(),
                    document.getStorageKey()
            ));
            return response.result();
        } catch (Exception exception) {
            throw new IllegalStateException(
                    "GraphRAG could not publish document " + request.documentId(),
                    exception
            );
        }
    }
}
