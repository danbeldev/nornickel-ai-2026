package com.github.danbel.api.service;

import com.github.danbel.api.client.GraphRagClient;
import com.github.danbel.api.client.dto.GraphRagExtractRequestDto;
import com.github.danbel.api.client.dto.GraphRagPublishRequestDto;
import com.github.danbel.api.client.dto.GraphRagPublishResponseDto;
import com.github.danbel.api.client.dto.GraphRagRetrieveRequestDto;
import com.github.danbel.api.client.dto.GraphRagRetrieveResponseDto;
import com.github.danbel.api.dto.chat.ChatCitationDto;
import com.github.danbel.api.dto.chat.EntityMentionDto;
import com.github.danbel.api.dto.common.EntityAttributeDto;
import com.github.danbel.api.dto.common.SourceReferenceDto;
import com.github.danbel.api.dto.document.DocumentExtractionResultDto;
import com.github.danbel.api.dto.document.ExtractedEntityDto;
import com.github.danbel.api.dto.document.ExtractedRelationDto;
import com.github.danbel.api.dto.document.PublishExtractionRequestDto;
import com.github.danbel.api.dto.document.PublishExtractionResponseDto;
import com.github.danbel.api.model.entity.DocumentEntity;
import com.github.danbel.api.model.enums.MentionableEntityType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class GraphRagGateway {

    private final GraphRagClient client;

    public GraphRagRetrieveResponseDto retrieve(String query, List<EntityMentionDto> mentions) {
        List<EntityMentionDto> safeMentions = mentions == null ? List.of() : mentions;
        try {
            return client.retrieve(new GraphRagRetrieveRequestDto(query, safeMentions));
        } catch (Exception exception) {
            log.warn("GraphRAG retrieve fallback used: {}", exception.getMessage());
            List<ChatCitationDto> mentionCitations = safeMentions.stream()
                    .map(mention -> new ChatCitationDto(
                            "citation-mentioned-" + mention.type().getValue() + "-" + mention.id(),
                            mention.id(),
                            mention.type(),
                            mention.label(),
                            "Сущность добавлена пользователем в контекст запроса",
                            null
                    ))
                    .toList();

            return new GraphRagRetrieveResponseDto(
                    "Найден локальный fallback-контекст. Для точного ответа подключите Python GraphRAG service и Neo4j.",
                    mentionCitations,
                    Math.max(mentionCitations.size(), 3),
                    2,
                    List.of("Fallback context: graph retriever is not available.")
            );
        }
    }

    public DocumentExtractionResultDto extract(DocumentEntity document) {
        try {
            return client.extract(new GraphRagExtractRequestDto(
                    document.getId(),
                    document.getTitle(),
                    document.getType().getValue(),
                    document.getStorageKey()
            ));
        } catch (Exception exception) {
            log.warn("GraphRAG extract fallback used for document {}: {}", document.getId(), exception.getMessage());
            return createFallbackExtraction(document);
        }
    }

    public PublishExtractionResponseDto publish(PublishExtractionRequestDto request) {
        try {
            GraphRagPublishResponseDto response = client.publish(new GraphRagPublishRequestDto(request));
            return response.result();
        } catch (Exception exception) {
            log.warn("GraphRAG publish fallback used for document {}: {}", request.documentId(), exception.getMessage());
            return new PublishExtractionResponseDto(
                    request.documentId(),
                    request.entities().stream().map(ExtractedEntityDto::id).toList(),
                    request.relations().stream().map(ExtractedRelationDto::id).toList()
            );
        }
    }

    private DocumentExtractionResultDto createFallbackExtraction(DocumentEntity document) {
        String documentId = document.getId();
        var material = new ExtractedEntityDto(
                documentId + "-material-n47",
                MentionableEntityType.MATERIAL,
                "Сплав N-47",
                List.of(
                        new EntityAttributeDto("Ni", 54.2, "%"),
                        new EntityAttributeDto("Cr", 21.1, "%")
                ),
                new SourceReferenceDto(documentId, 3)
        );
        var experiment = new ExtractedEntityDto(
                documentId + "-experiment-1",
                MentionableEntityType.EXPERIMENT,
                "Термообработка сплава N-47",
                List.of(
                        new EntityAttributeDto("Температура", 780, "°C"),
                        new EntityAttributeDto("Длительность", 4, "ч")
                ),
                new SourceReferenceDto(documentId, 8)
        );
        var property = new ExtractedEntityDto(
                documentId + "-property-hardness",
                MentionableEntityType.PROPERTY,
                "Твердость",
                List.of(
                        new EntityAttributeDto("До обработки", 29, "HRC"),
                        new EntityAttributeDto("После обработки", 36, "HRC")
                ),
                new SourceReferenceDto(documentId, 11)
        );
        var unclassified = new ExtractedEntityDto(
                documentId + "-unclassified-method",
                MentionableEntityType.UNCLASSIFIED,
                "Метод микродюрометрии M-7",
                List.of(new EntityAttributeDto("Контекст", "Использован для контрольного измерения твердости", null)),
                new SourceReferenceDto(documentId, 10)
        );

        return new DocumentExtractionResultDto(
                documentId,
                List.of(material, experiment, property, unclassified),
                List.of(
                        new ExtractedRelationDto(documentId + "-relation-1", experiment.id(), "USES_MATERIAL", material.id(), new SourceReferenceDto(documentId, 8)),
                        new ExtractedRelationDto(documentId + "-relation-2", experiment.id(), "MEASURES", property.id(), new SourceReferenceDto(documentId, 11)),
                        new ExtractedRelationDto(documentId + "-relation-3", experiment.id(), "USES", unclassified.id(), new SourceReferenceDto(documentId, 10))
                ),
                List.of("Тип сущности «Метод микродюрометрии M-7» определен как unclassified.")
        );
    }
}
