package com.github.danbel.api.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.github.danbel.api.config.AppProperties;
import com.github.danbel.api.dto.document.DocumentExtractionResultDto;
import com.github.danbel.api.dto.document.DocumentRecordDto;
import com.github.danbel.api.dto.document.ExtractedEntityDto;
import com.github.danbel.api.dto.document.ExtractedRelationDto;
import com.github.danbel.api.dto.document.PublishExtractionRequestDto;
import com.github.danbel.api.dto.document.PublishExtractionResponseDto;
import com.github.danbel.api.dto.document.UploadDocumentResponseDto;
import com.github.danbel.api.dto.material.MaterialCompositionItemDto;
import com.github.danbel.api.event.DocumentProcessingRequestedEvent;
import com.github.danbel.api.event.DocumentPublishRequestedEvent;
import com.github.danbel.api.exception.ResourceNotFoundException;
import com.github.danbel.api.mapper.ApiDtoMapper;
import com.github.danbel.api.mapper.JsonPayloadMapper;
import com.github.danbel.api.model.entity.DocumentEntity;
import com.github.danbel.api.model.entity.ExperimentEntity;
import com.github.danbel.api.model.entity.ExtractionDraftEntity;
import com.github.danbel.api.model.entity.KnowledgeConnectionEntity;
import com.github.danbel.api.model.entity.KnowledgeEntityRecord;
import com.github.danbel.api.model.entity.MaterialEntity;
import com.github.danbel.api.model.enums.DocumentStatus;
import com.github.danbel.api.model.enums.DocumentType;
import com.github.danbel.api.model.enums.IngestionJobType;
import com.github.danbel.api.model.enums.MentionableEntityType;
import com.github.danbel.api.repository.DocumentRepository;
import com.github.danbel.api.repository.ExperimentRepository;
import com.github.danbel.api.repository.ExtractionDraftRepository;
import com.github.danbel.api.repository.KnowledgeConnectionRepository;
import com.github.danbel.api.repository.KnowledgeEntityRepository;
import com.github.danbel.api.repository.MaterialRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DocumentService {

    private static final TypeReference<List<ExtractedEntityDto>> EXTRACTED_ENTITIES = new TypeReference<>() {
    };
    private static final TypeReference<List<ExtractedRelationDto>> EXTRACTED_RELATIONS = new TypeReference<>() {
    };
    private static final TypeReference<List<String>> STRING_LIST = new TypeReference<>() {
    };

    private final DocumentRepository documentRepository;
    private final ExtractionDraftRepository extractionDraftRepository;
    private final MaterialRepository materialRepository;
    private final ExperimentRepository experimentRepository;
    private final KnowledgeEntityRepository knowledgeEntityRepository;
    private final KnowledgeConnectionRepository knowledgeConnectionRepository;
    private final FileStorageService fileStorageService;
    private final KafkaEventPublisher eventPublisher;
    private final AppProperties properties;
    private final IngestionJobService jobService;
    private final GraphRagGateway graphRagGateway;
    private final JsonPayloadMapper json;
    private final ApiDtoMapper mapper;

    public List<DocumentRecordDto> getDocuments() {
        return documentRepository.findAllByOrderByIndexedAtDesc().stream().map(mapper::toDocument).toList();
    }

    public List<DocumentRecordDto> getRecentDocuments(int limit) {
        return documentRepository.findAllByOrderByIndexedAtDesc().stream()
                .limit(limit)
                .map(mapper::toDocument)
                .toList();
    }

    public DocumentRecordDto getDocument(String documentId) {
        return documentRepository.findById(documentId)
                .map(mapper::toDocument)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + documentId));
    }

    public DocumentExtractionResultDto getExtractionDraft(String documentId) {
        return extractionDraftRepository.findByDocumentId(documentId)
                .map(this::toExtractionResult)
                .orElseThrow(() -> new ResourceNotFoundException("Extraction draft not found for document: " + documentId));
    }

    @Transactional
    public UploadDocumentResponseDto uploadDocument(MultipartFile file) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Uploaded file is empty");
        }

        OffsetDateTime now = OffsetDateTime.now();
        String documentId = "doc-" + UUID.randomUUID();
        String storageKey = fileStorageService.store(file);
        DocumentType type = resolveType(file.getOriginalFilename());
        DocumentEntity document = documentRepository.save(DocumentEntity.builder()
                .id(documentId)
                .title(resolveTitle(file.getOriginalFilename()))
                .type(type)
                .year(now.getYear())
                .author("Загружено пользователем")
                .description("Новый документ, переданный в pipeline извлечения знаний.")
                .pages(type == DocumentType.CSV || type == DocumentType.XLSX ? null : 0)
                .status(DocumentStatus.PROCESSING)
                .indexedAt(now)
                .extractedEntities(0)
                .storageKey(storageKey)
                .experimentIdsJson(json.write(List.of()))
                .materialIdsJson(json.write(List.of()))
                .issueIdsJson(json.write(List.of()))
                .build());

        var job = jobService.create(documentId, IngestionJobType.DOCUMENT_PROCESSING);
        DocumentExtractionResultDto extraction;
        if (properties.getIngestion().isProcessImmediately()) {
            extraction = processDocument(documentId, job.getId());
        } else {
            eventPublisher.publishDocumentProcessing(new DocumentProcessingRequestedEvent(job.getId(), documentId, now));
            extraction = new DocumentExtractionResultDto(documentId, List.of(), List.of(), List.of("Документ поставлен в очередь обработки."));
        }

        return new UploadDocumentResponseDto(mapper.toDocument(documentRepository.findById(documentId).orElse(document)), extraction);
    }

    @Transactional
    public DocumentRecordDto enqueueDocument(MultipartFile file) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Uploaded file is empty");
        }

        OffsetDateTime now = OffsetDateTime.now();
        String documentId = "doc-" + UUID.randomUUID();
        String storageKey = fileStorageService.store(file);
        DocumentType type = resolveType(file.getOriginalFilename());
        DocumentEntity document = documentRepository.save(DocumentEntity.builder()
                .id(documentId)
                .title(resolveTitle(file.getOriginalFilename()))
                .type(type)
                .year(now.getYear())
                .author("Загружено пользователем")
                .description("Документ поставлен в очередь извлечения знаний.")
                .pages(type == DocumentType.CSV || type == DocumentType.XLSX ? null : 0)
                .status(DocumentStatus.PROCESSING)
                .indexedAt(now)
                .extractedEntities(0)
                .storageKey(storageKey)
                .experimentIdsJson(json.write(List.of()))
                .materialIdsJson(json.write(List.of()))
                .issueIdsJson(json.write(List.of()))
                .build());

        var job = jobService.create(documentId, IngestionJobType.DOCUMENT_PROCESSING);
        eventPublisher.publishDocumentProcessing(new DocumentProcessingRequestedEvent(job.getId(), documentId, now));
        return mapper.toDocument(document);
    }

    @Transactional
    public DocumentExtractionResultDto processDocument(String documentId, String jobId) {
        DocumentEntity document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + documentId));
        var existingDraft = extractionDraftRepository.findByDocumentId(documentId);
        if (existingDraft.isPresent()) {
            return toExtractionResult(existingDraft.get());
        }

        try {
            jobService.markRunning(jobId, 35);
            DocumentExtractionResultDto extraction = graphRagGateway.extract(document);
            saveDraft(extraction);
            document.setStatus(DocumentStatus.READY);
            document.setIndexedAt(OffsetDateTime.now());
            document.setExtractedEntities(extraction.entities().size());
            documentRepository.save(document);
            jobService.markReadyForReview(jobId);
            return extraction;
        } catch (Exception exception) {
            document.setStatus(DocumentStatus.ERROR);
            documentRepository.save(document);
            jobService.markFailed(jobId, exception);
            throw exception;
        }
    }

    @Transactional
    public PublishExtractionResponseDto publishExtraction(PublishExtractionRequestDto request) {
        saveDraft(new DocumentExtractionResultDto(request.documentId(), safeEntities(request), safeRelations(request), List.of()));
        var job = jobService.create(request.documentId(), IngestionJobType.DOCUMENT_PUBLISH);
        if (properties.getIngestion().isProcessImmediately()) {
            return publishExtraction(request, job.getId());
        }
        eventPublisher.publishDocumentPublish(new DocumentPublishRequestedEvent(job.getId(), request.documentId(), OffsetDateTime.now()));
        return new PublishExtractionResponseDto(request.documentId(), List.of(), List.of());
    }

    @Transactional
    public PublishExtractionResponseDto publishStoredDraft(String documentId, String jobId) {
        DocumentExtractionResultDto draft = getExtractionDraft(documentId);
        return publishExtraction(new PublishExtractionRequestDto(documentId, draft.entities(), draft.relations()), jobId);
    }

    private PublishExtractionResponseDto publishExtraction(PublishExtractionRequestDto request, String jobId) {
        try {
            jobService.markRunning(jobId, 50);
            PublishExtractionResponseDto response = graphRagGateway.publish(request);
            mirrorPublishedExtraction(request);
            jobService.markPublished(jobId);
            return response;
        } catch (Exception exception) {
            jobService.markFailed(jobId, exception);
            throw exception;
        }
    }

    private void mirrorPublishedExtraction(PublishExtractionRequestDto request) {
        DocumentEntity document = documentRepository.findById(request.documentId())
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + request.documentId()));

        List<String> materialIds = safeEntities(request).stream()
                .filter(entity -> entity.type() == MentionableEntityType.MATERIAL)
                .map(ExtractedEntityDto::id)
                .toList();
        List<String> experimentIds = safeEntities(request).stream()
                .filter(entity -> entity.type() == MentionableEntityType.EXPERIMENT)
                .map(ExtractedEntityDto::id)
                .toList();

        document.setMaterialIdsJson(json.write(materialIds));
        document.setExperimentIdsJson(json.write(experimentIds));
        document.setStatus(DocumentStatus.READY);
        documentRepository.save(document);

        safeEntities(request).forEach(entity -> {
            knowledgeEntityRepository.save(toKnowledgeEntity(request.documentId(), entity));
            if (entity.type() == MentionableEntityType.MATERIAL && !materialRepository.existsById(entity.id())) {
                materialRepository.save(toMaterial(request, entity));
            }
            if (entity.type() == MentionableEntityType.EXPERIMENT && !experimentRepository.existsById(entity.id())) {
                experimentRepository.save(toExperiment(request, entity, document));
            }
        });

        safeRelations(request).forEach(relation -> knowledgeConnectionRepository.save(KnowledgeConnectionEntity.builder()
                .id(relation.id())
                .source(relation.sourceId())
                .target(relation.targetId())
                .label(relation.type())
                .build()));
    }

    private KnowledgeEntityRecord toKnowledgeEntity(String documentId, ExtractedEntityDto entity) {
        long index = Math.max(knowledgeEntityRepository.count(), 1);
        return KnowledgeEntityRecord.builder()
                .id(entity.id())
                .type(entity.type())
                .title(entity.name())
                .subtitle(subtitle(entity.type()))
                .description("Сущность извлечена из документа " + documentId + ".")
                .positionX(180.0 + (index % 4) * 310)
                .positionY(120.0 + (index / 4) * 180)
                .attributesJson(json.write(entity.attributes() == null ? List.of() : entity.attributes()))
                .sourcesJson(json.write(List.of(entity.source())))
                .build();
    }

    private MaterialEntity toMaterial(PublishExtractionRequestDto request, ExtractedEntityDto entity) {
        List<String> experimentIds = safeRelations(request).stream()
                .filter(relation -> "USES_MATERIAL".equals(relation.type()) && entity.id().equals(relation.targetId()))
                .map(ExtractedRelationDto::sourceId)
                .toList();

        return MaterialEntity.builder()
                .id(entity.id())
                .name(entity.name())
                .category("Материал из загруженного документа")
                .description("Материал извлечен из документа " + request.documentId() + ".")
                .aliasesJson(json.write(List.of()))
                .compositionJson(json.write((entity.attributes() == null ? List.<com.github.danbel.api.dto.common.EntityAttributeDto>of() : entity.attributes()).stream()
                        .map(attribute -> new MaterialCompositionItemDto(attribute.name(), String.valueOf(attribute.value()) + (attribute.unit() == null ? "" : " " + attribute.unit())))
                        .toList()))
                .keyPropertiesJson(json.write(List.of()))
                .experimentIdsJson(json.write(experimentIds))
                .documentIdsJson(json.write(List.of(request.documentId())))
                .issueIdsJson(json.write(List.of()))
                .build();
    }

    private ExperimentEntity toExperiment(PublishExtractionRequestDto request, ExtractedEntityDto entity, DocumentEntity document) {
        ExtractedRelationDto materialRelation = safeRelations(request).stream()
                .filter(relation -> "USES_MATERIAL".equals(relation.type()) && entity.id().equals(relation.sourceId()))
                .findFirst()
                .orElse(null);
        ExtractedEntityDto material = safeEntities(request).stream()
                .filter(candidate -> materialRelation != null && candidate.id().equals(materialRelation.targetId()))
                .findFirst()
                .orElse(null);
        ExtractedRelationDto propertyRelation = safeRelations(request).stream()
                .filter(relation -> "MEASURES".equals(relation.type()) && entity.id().equals(relation.sourceId()))
                .findFirst()
                .orElse(null);
        ExtractedEntityDto property = safeEntities(request).stream()
                .filter(candidate -> propertyRelation != null && candidate.id().equals(propertyRelation.targetId()))
                .findFirst()
                .orElse(null);

        Integer temperature = findIntegerAttribute(entity, "температура");
        String duration = findAttributeWithUnit(entity, "длительность", "Не указано");

        return ExperimentEntity.builder()
                .id(entity.id())
                .title(entity.name())
                .materialId(material == null ? "unknown-material" : material.id())
                .material(material == null ? "Материал не указан" : material.name())
                .materialDetails("Извлечено из документа " + request.documentId())
                .temperature(temperature)
                .duration(duration)
                .coolingMethod("Не указано")
                .property(property == null ? "Свойство не указано" : property.name())
                .valueBefore("—")
                .valueAfter("—")
                .effect("—")
                .equipmentId(null)
                .equipment("Не указано")
                .teamId("unknown-team")
                .team("Не указано")
                .date(LocalDate.now())
                .sourceDocumentId(request.documentId())
                .sourceName(document.getTitle())
                .sourcePage(entity.source() == null ? null : entity.source().page())
                .confidence(1.0)
                .notes("Добавлено после публикации результата извлечения.")
                .build();
    }

    private void saveDraft(DocumentExtractionResultDto extraction) {
        ExtractionDraftEntity draft = extractionDraftRepository.findByDocumentId(extraction.documentId())
                .orElseGet(() -> ExtractionDraftEntity.builder()
                        .id("draft-" + UUID.randomUUID())
                        .documentId(extraction.documentId())
                        .createdAt(OffsetDateTime.now())
                        .build());
        draft.setEntitiesJson(json.write(extraction.entities() == null ? List.of() : extraction.entities()));
        draft.setRelationsJson(json.write(extraction.relations() == null ? List.of() : extraction.relations()));
        draft.setWarningsJson(json.write(extraction.warnings() == null ? List.of() : extraction.warnings()));
        extractionDraftRepository.save(draft);
    }

    private DocumentExtractionResultDto toExtractionResult(ExtractionDraftEntity draft) {
        return new DocumentExtractionResultDto(
                draft.getDocumentId(),
                json.readList(draft.getEntitiesJson(), EXTRACTED_ENTITIES),
                json.readList(draft.getRelationsJson(), EXTRACTED_RELATIONS),
                json.readList(draft.getWarningsJson(), STRING_LIST)
        );
    }

    private List<ExtractedEntityDto> safeEntities(PublishExtractionRequestDto request) {
        return request.entities() == null ? List.of() : request.entities();
    }

    private List<ExtractedRelationDto> safeRelations(PublishExtractionRequestDto request) {
        return request.relations() == null ? List.of() : request.relations();
    }

    private String subtitle(MentionableEntityType type) {
        return switch (type) {
            case MATERIAL -> "Материал";
            case EXPERIMENT -> "Экспериментальные данные";
            case DOCUMENT -> "Документ";
            case DATA_ISSUE -> "Проблема в данных";
            case PROPERTY -> "Свойство";
            case REGIME -> "Режим";
            case EQUIPMENT -> "Оборудование";
            case TEAM -> "Команда";
            case CONCLUSION -> "Вывод";
            case UNCLASSIFIED -> "Неопределенная сущность";
        };
    }

    private Integer findIntegerAttribute(ExtractedEntityDto entity, String name) {
        if (entity.attributes() == null) {
            return null;
        }
        return entity.attributes().stream()
                .filter(attribute -> attribute.name().toLowerCase(Locale.ROOT).contains(name))
                .filter(attribute -> attribute.value() instanceof Number)
                .map(attribute -> ((Number) attribute.value()).intValue())
                .findFirst()
                .orElse(null);
    }

    private String findAttributeWithUnit(ExtractedEntityDto entity, String name, String fallback) {
        if (entity.attributes() == null) {
            return fallback;
        }
        return entity.attributes().stream()
                .filter(attribute -> attribute.name().toLowerCase(Locale.ROOT).contains(name))
                .findFirst()
                .map(attribute -> String.valueOf(attribute.value()) + (attribute.unit() == null ? "" : " " + attribute.unit()))
                .orElse(fallback);
    }

    private DocumentType resolveType(String filename) {
        if (filename == null || !filename.contains(".")) {
            return DocumentType.PDF;
        }
        return switch (filename.substring(filename.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT)) {
            case "docx" -> DocumentType.DOCX;
            case "xlsx" -> DocumentType.XLSX;
            case "csv" -> DocumentType.CSV;
            default -> DocumentType.PDF;
        };
    }

    private String resolveTitle(String filename) {
        if (filename == null || filename.isBlank()) {
            return "Новый документ";
        }
        int dotIndex = filename.lastIndexOf('.');
        return dotIndex > 0 ? filename.substring(0, dotIndex) : filename;
    }
}
