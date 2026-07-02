package com.github.danbel.api.mapper;

import tools.jackson.core.type.TypeReference;
import com.github.danbel.api.dto.chat.ChatCitationDto;
import com.github.danbel.api.dto.chat.ChatEvidenceDto;
import com.github.danbel.api.dto.chat.ChatMessageDto;
import com.github.danbel.api.dto.chat.ChatSummaryDto;
import com.github.danbel.api.dto.chat.ChatStatusEventDto;
import com.github.danbel.api.dto.chat.EntityMentionDto;
import com.github.danbel.api.dto.chat.ResearchChatDto;
import com.github.danbel.api.dto.common.EntityAttributeDto;
import com.github.danbel.api.dto.common.SourceReferenceDto;
import com.github.danbel.api.dto.document.DocumentRecordDto;
import com.github.danbel.api.dto.experiment.ExperimentRecordDto;
import com.github.danbel.api.dto.graph.GraphPositionDto;
import com.github.danbel.api.dto.graph.KnowledgeGraphConnectionDto;
import com.github.danbel.api.dto.graph.KnowledgeGraphEntityDto;
import com.github.danbel.api.dto.issue.DataIssueRecordDto;
import com.github.danbel.api.dto.issue.RelatedEntityLinkDto;
import com.github.danbel.api.dto.job.IngestionJobDto;
import com.github.danbel.api.dto.material.MaterialCompositionItemDto;
import com.github.danbel.api.dto.material.MaterialKeyPropertyDto;
import com.github.danbel.api.dto.material.MaterialRecordDto;
import com.github.danbel.api.model.entity.ChatEntity;
import com.github.danbel.api.model.entity.ChatMessageEntity;
import com.github.danbel.api.model.entity.DataIssueEntity;
import com.github.danbel.api.model.entity.DocumentEntity;
import com.github.danbel.api.model.entity.ExperimentEntity;
import com.github.danbel.api.model.entity.IngestionJobEntity;
import com.github.danbel.api.model.entity.KnowledgeConnectionEntity;
import com.github.danbel.api.model.entity.KnowledgeEntityRecord;
import com.github.danbel.api.model.entity.MaterialEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class ApiDtoMapper {

    private static final TypeReference<List<String>> STRING_LIST = new TypeReference<>() {
    };
    private static final TypeReference<List<EntityMentionDto>> ENTITY_MENTIONS = new TypeReference<>() {
    };
    private static final TypeReference<List<ChatCitationDto>> CHAT_CITATIONS = new TypeReference<>() {
    };
    private static final TypeReference<ChatEvidenceDto> CHAT_EVIDENCE = new TypeReference<>() {
    };
    private static final TypeReference<List<ChatStatusEventDto>> CHAT_STATUS_HISTORY = new TypeReference<>() {
    };
    private static final TypeReference<List<EntityAttributeDto>> ENTITY_ATTRIBUTES = new TypeReference<>() {
    };
    private static final TypeReference<List<SourceReferenceDto>> SOURCE_REFERENCES = new TypeReference<>() {
    };
    private static final TypeReference<List<MaterialCompositionItemDto>> COMPOSITION_ITEMS = new TypeReference<>() {
    };
    private static final TypeReference<List<MaterialKeyPropertyDto>> KEY_PROPERTIES = new TypeReference<>() {
    };
    private static final TypeReference<List<RelatedEntityLinkDto>> RELATED_ENTITIES = new TypeReference<>() {
    };

    private final JsonPayloadMapper json;

    public ChatSummaryDto toChatSummary(ChatEntity entity) {
        return new ChatSummaryDto(entity.getId(), entity.getTitle(), entity.getGroup(), entity.getUpdatedAt());
    }

    public ResearchChatDto toResearchChat(ChatEntity entity) {
        return new ResearchChatDto(
                entity.getId(),
                entity.getTitle(),
                entity.getGroup(),
                entity.getUpdatedAt(),
                entity.getMessages().stream().map(this::toChatMessage).toList()
        );
    }

    public ChatMessageDto toChatMessage(ChatMessageEntity entity) {
        return new ChatMessageDto(
                entity.getId(),
                entity.getRole(),
                entity.getText(),
                json.readList(entity.getMentionsJson(), ENTITY_MENTIONS),
                json.readList(entity.getCitationsJson(), CHAT_CITATIONS),
                entity.getStatus(),
                entity.getRequestId(),
                entity.getModel(),
                entity.getPromptTokens(),
                entity.getCompletionTokens(),
                entity.getGenerationDurationMs(),
                entity.getEvidenceJson() == null
                        ? null
                        : json.read(entity.getEvidenceJson(), CHAT_EVIDENCE),
                json.readList(entity.getStatusHistoryJson(), CHAT_STATUS_HISTORY),
                entity.getErrorMessage(),
                entity.getCreatedAt()
        );
    }

    public DocumentRecordDto toDocument(DocumentEntity entity) {
        return new DocumentRecordDto(
                entity.getId(),
                entity.getTitle(),
                entity.getType(),
                entity.getYear(),
                entity.getAuthor(),
                entity.getDescription(),
                entity.getPages(),
                entity.getStatus(),
                entity.getIndexedAt(),
                entity.getExtractedEntities(),
                entity.getStorageKey() != null && !entity.getStorageKey().isBlank(),
                json.readList(entity.getExperimentIdsJson(), STRING_LIST),
                json.readList(entity.getMaterialIdsJson(), STRING_LIST),
                json.readList(entity.getIssueIdsJson(), STRING_LIST)
        );
    }

    public ExperimentRecordDto toExperiment(ExperimentEntity entity) {
        return new ExperimentRecordDto(
                entity.getId(),
                entity.getTitle(),
                entity.getMaterialId(),
                entity.getMaterial(),
                entity.getMaterialDetails(),
                entity.getTemperature(),
                entity.getDuration(),
                entity.getCoolingMethod(),
                entity.getProperty(),
                entity.getValueBefore(),
                entity.getValueAfter(),
                entity.getEffect(),
                entity.getEquipmentId(),
                entity.getEquipment(),
                entity.getTeamId(),
                entity.getTeam(),
                entity.getDate(),
                entity.getSourceDocumentId(),
                entity.getSourceName(),
                entity.getSourcePage(),
                entity.getConfidence(),
                entity.getNotes()
        );
    }

    public MaterialRecordDto toMaterial(MaterialEntity entity) {
        return new MaterialRecordDto(
                entity.getId(),
                entity.getName(),
                entity.getCategory(),
                entity.getDescription(),
                json.readList(entity.getAliasesJson(), STRING_LIST),
                json.readList(entity.getCompositionJson(), COMPOSITION_ITEMS),
                json.readList(entity.getKeyPropertiesJson(), KEY_PROPERTIES),
                json.readList(entity.getExperimentIdsJson(), STRING_LIST),
                json.readList(entity.getDocumentIdsJson(), STRING_LIST),
                json.readList(entity.getIssueIdsJson(), STRING_LIST)
        );
    }

    public DataIssueRecordDto toDataIssue(DataIssueEntity entity) {
        return new DataIssueRecordDto(
                entity.getId(),
                entity.getType(),
                entity.getSeverity(),
                entity.getTitle(),
                entity.getDescription(),
                entity.getRecommendation(),
                entity.getDetectedAt(),
                json.readList(entity.getRelatedEntitiesJson(), RELATED_ENTITIES)
        );
    }

    public KnowledgeGraphEntityDto toKnowledgeEntity(KnowledgeEntityRecord entity) {
        return new KnowledgeGraphEntityDto(
                entity.getId(),
                entity.getType(),
                entity.getTitle(),
                entity.getSubtitle(),
                entity.getDescription(),
                new GraphPositionDto(entity.getPositionX(), entity.getPositionY()),
                json.readList(entity.getAttributesJson(), ENTITY_ATTRIBUTES),
                json.readList(entity.getSourcesJson(), SOURCE_REFERENCES),
                entity.getConfidence(),
                entity.getVerificationStatus(),
                entity.getGeography(),
                entity.getPublicationYear(),
                entity.getLanguage(),
                entity.getVersion(),
                entity.getUpdatedAt()
        );
    }

    public KnowledgeGraphConnectionDto toKnowledgeConnection(KnowledgeConnectionEntity entity) {
        return new KnowledgeGraphConnectionDto(entity.getId(), entity.getSource(), entity.getTarget(), entity.getLabel());
    }

    public IngestionJobDto toJob(IngestionJobEntity entity) {
        return new IngestionJobDto(
                entity.getId(),
                entity.getDocumentId(),
                entity.getType(),
                entity.getStatus(),
                entity.getProgress(),
                entity.getStage(),
                entity.getErrorMessage(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
