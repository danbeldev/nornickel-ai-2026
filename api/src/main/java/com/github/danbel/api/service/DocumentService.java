package com.github.danbel.api.service;

import tools.jackson.core.type.TypeReference;
import com.github.danbel.api.config.AppProperties;
import com.github.danbel.api.dto.document.DocumentExtractionResultDto;
import com.github.danbel.api.dto.document.DocumentRecordDto;
import com.github.danbel.api.dto.common.ModelTokenUsageDto;
import com.github.danbel.api.dto.document.ExtractedEntityDto;
import com.github.danbel.api.dto.document.ExtractedRelationDto;
import com.github.danbel.api.dto.document.PublishExtractionRequestDto;
import com.github.danbel.api.dto.document.PublishExtractionResponseDto;
import com.github.danbel.api.dto.document.UploadDocumentResponseDto;
import com.github.danbel.api.dto.document.VisualFragmentDto;
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
import com.github.danbel.api.model.entity.KnowledgeEntityVersionEntity;
import com.github.danbel.api.model.entity.KnowledgeFactEntity;
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
import com.github.danbel.api.repository.KnowledgeEntityVersionRepository;
import com.github.danbel.api.repository.KnowledgeFactRepository;
import com.github.danbel.api.repository.MaterialRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
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
    private static final TypeReference<List<VisualFragmentDto>> VISUAL_FRAGMENTS = new TypeReference<>() {
    };
    private static final TypeReference<List<String>> STRING_LIST = new TypeReference<>() {
    };

    private final DocumentRepository documentRepository;
    private final ExtractionDraftRepository extractionDraftRepository;
    private final MaterialRepository materialRepository;
    private final ExperimentRepository experimentRepository;
    private final KnowledgeEntityRepository knowledgeEntityRepository;
    private final KnowledgeConnectionRepository knowledgeConnectionRepository;
    private final KnowledgeFactRepository knowledgeFactRepository;
    private final KnowledgeEntityVersionRepository knowledgeEntityVersionRepository;
    private final FileStorageService fileStorageService;
    private final RemoteDocumentFetcher remoteDocumentFetcher;
    private final KafkaEventPublisher eventPublisher;
    private final AppProperties properties;
    private final IngestionJobService jobService;
    private final GraphRagGateway graphRagGateway;
    private final DataQualityService dataQualityService;
    private final KnowledgeRelationPolicy knowledgeRelationPolicy;
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

    public DocumentDownload downloadDocument(String documentId) {
        DocumentEntity document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + documentId));
        if (document.getStorageKey() == null || document.getStorageKey().isBlank()) {
            throw new ResourceNotFoundException(
                    "Original file is not available for document: " + documentId
            );
        }

        FileStorageService.StoredFile storedFile = fileStorageService.open(document.getStorageKey());
        String filename = document.getTitle()
                .replaceAll("[\\\\/:*?\"<>|\\r\\n]+", "_")
                + "." + document.getType().getValue();
        String contentType = storedFile.contentType() == null || storedFile.contentType().isBlank()
                ? "application/octet-stream"
                : storedFile.contentType();
        return new DocumentDownload(
                filename,
                contentType,
                storedFile.size(),
                storedFile.content()
        );
    }

    public DocumentDownload downloadVisualFragment(
            String documentId,
            String visualId
    ) {
        VisualFragmentDto fragment = getExtractionDraft(documentId)
                .visualFragments()
                .stream()
                .filter(item -> item.id().equals(visualId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Visual fragment not found: " + visualId
                ));
        if (fragment.storageKey() == null || fragment.storageKey().isBlank()) {
            throw new ResourceNotFoundException(
                    "Visual fragment has no stored image: " + visualId
            );
        }
        FileStorageService.StoredFile storedFile = fileStorageService.open(
                fragment.storageKey()
        );
        return new DocumentDownload(
                visualId + ".jpg",
                fragment.contentType() == null
                        ? "image/jpeg"
                        : fragment.contentType(),
                storedFile.size(),
                storedFile.content()
        );
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
            extraction = new DocumentExtractionResultDto(
                    documentId,
                    List.of(),
                    List.of(),
                    List.of(),
                    List.of("Документ поставлен в очередь обработки."),
                    null
            );
        }

        return new UploadDocumentResponseDto(
                mapper.toDocument(documentRepository.findById(documentId).orElse(document)),
                extraction,
                job.getId()
        );
    }

    @Transactional
    public UploadDocumentResponseDto enqueueDocument(MultipartFile file) {
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
        return new UploadDocumentResponseDto(
                mapper.toDocument(document),
                new DocumentExtractionResultDto(
                        documentId,
                        List.of(),
                        List.of(),
                        List.of(),
                        List.of("Документ поставлен в очередь обработки."),
                        null
                ),
                job.getId()
        );
    }

    @Transactional
    public UploadDocumentResponseDto enqueueDocumentUrl(String url) {
        RemoteDocumentFetcher.RemoteDocument remote = remoteDocumentFetcher.fetch(url);
        OffsetDateTime now = OffsetDateTime.now();
        String documentId = "doc-" + UUID.randomUUID();
        DocumentType type = resolveType(remote.filename());
        String storageKey = fileStorageService.store(
                remote.filename(),
                remote.contentType(),
                remote.content()
        );
        OffsetDateTime publishedAt = remote.publishedAt();
        DocumentEntity document = documentRepository.save(DocumentEntity.builder()
                .id(documentId)
                .title(remote.title())
                .type(type)
                .year(publishedAt == null ? now.getYear() : publishedAt.getYear())
                .author(remote.author())
                .description(remote.description())
                .pages(type == DocumentType.HTML ? 1 : null)
                .status(DocumentStatus.PROCESSING)
                .indexedAt(now)
                .extractedEntities(0)
                .storageKey(storageKey)
                .sourceUrl(remote.sourceUrl())
                .publishedAt(publishedAt)
                .experimentIdsJson(json.write(List.of()))
                .materialIdsJson(json.write(List.of()))
                .issueIdsJson(json.write(List.of()))
                .build());

        var job = jobService.create(documentId, IngestionJobType.DOCUMENT_PROCESSING);
        eventPublisher.publishDocumentProcessing(new DocumentProcessingRequestedEvent(
                job.getId(),
                documentId,
                now
        ));
        return new UploadDocumentResponseDto(
                mapper.toDocument(document),
                new DocumentExtractionResultDto(
                        documentId,
                        List.of(),
                        List.of(),
                        List.of(),
                        List.of("Документ по ссылке поставлен в очередь обработки."),
                        null
                ),
                job.getId()
        );
    }

    public DocumentExtractionResultDto processDocument(String documentId, String jobId) {
        DocumentEntity document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + documentId));
        if (jobService.isCanceled(jobId)) {
            return canceledExtraction(documentId);
        }
        var existingDraft = extractionDraftRepository.findByDocumentId(documentId);
        if (existingDraft.isPresent()) {
            document.setStatus(DocumentStatus.READY);
            documentRepository.save(document);
            jobService.markReadyForReview(jobId);
            return toExtractionResult(existingDraft.get());
        }

        try {
            jobService.markRunning(jobId, 5, "Kafka consumer принял документ");
            DocumentExtractionResultDto extraction = graphRagGateway.extract(document, jobId);
            if (jobService.isCanceled(jobId)) {
                return canceledExtraction(documentId);
            }
            jobService.updateProgress(jobId, 95, "Сохранение черновика и найденных связей");
            saveDraft(extraction);
            document.setStatus(DocumentStatus.READY);
            document.setIndexedAt(OffsetDateTime.now());
            document.setExtractedEntities(extraction.entities().size());
            if (extraction.tokenUsage() != null) {
                int promptTokens = extraction.tokenUsage().stream()
                        .mapToInt(usage -> usage.promptTokens() == null ? 0 : usage.promptTokens())
                        .sum();
                int completionTokens = extraction.tokenUsage().stream()
                        .mapToInt(usage -> usage.completionTokens() == null ? 0 : usage.completionTokens())
                        .sum();
                document.setProcessingPromptTokens(promptTokens);
                document.setProcessingCompletionTokens(completionTokens);
                document.setProcessingTotalTokens(promptTokens + completionTokens);
                document.setProcessingTokenUsageJson(json.write(extraction.tokenUsage()));
            }
            documentRepository.save(document);
            jobService.markReadyForReview(jobId);
            return extraction;
        } catch (Exception exception) {
            if (jobService.isCanceled(jobId)) {
                document.setStatus(DocumentStatus.CANCELED);
                documentRepository.save(document);
                return canceledExtraction(documentId);
            }
            document.setStatus(DocumentStatus.ERROR);
            documentRepository.save(document);
            jobService.markFailed(jobId, exception);
            throw exception;
        }
    }

    @Transactional
    public PublishExtractionResponseDto publishExtraction(PublishExtractionRequestDto request) {
        PublishExtractionRequestDto normalizedRequest = knowledgeRelationPolicy.normalize(
                dataQualityService.normalizeDataIssueIds(request)
        );
        saveDraft(new DocumentExtractionResultDto(
                normalizedRequest.documentId(),
                safeEntities(normalizedRequest),
                safeRelations(normalizedRequest),
                getStoredVisualFragments(normalizedRequest.documentId()),
                List.of(),
                getStoredTokenUsage(normalizedRequest.documentId())
        ));
        var job = jobService.create(normalizedRequest.documentId(), IngestionJobType.DOCUMENT_PUBLISH);
        if (properties.getIngestion().isProcessImmediately()) {
            return publishExtraction(normalizedRequest, job.getId());
        }
        eventPublisher.publishDocumentPublish(new DocumentPublishRequestedEvent(
                job.getId(),
                normalizedRequest.documentId(),
                OffsetDateTime.now()
        ));
        return new PublishExtractionResponseDto(normalizedRequest.documentId(), List.of(), List.of(), job.getId());
    }

    public PublishExtractionResponseDto publishStoredDraft(String documentId, String jobId) {
        DocumentExtractionResultDto draft = getExtractionDraft(documentId);
        return publishExtraction(new PublishExtractionRequestDto(documentId, draft.entities(), draft.relations()), jobId);
    }

    private PublishExtractionResponseDto publishExtraction(PublishExtractionRequestDto request, String jobId) {
        try {
            PublishExtractionRequestDto normalizedRequest = knowledgeRelationPolicy.normalize(request);
            jobService.markRunning(jobId, 25, "Подготовка данных к публикации");
            DocumentEntity document = documentRepository.findById(normalizedRequest.documentId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Document not found: " + normalizedRequest.documentId()
                    ));
            PublishExtractionResponseDto response = graphRagGateway.publish(document, normalizedRequest);
            jobService.updateProgress(jobId, 85, "Сохранение сущностей и связей");
            mirrorPublishedExtraction(normalizedRequest);
            dataQualityService.saveExplicitIssues(normalizedRequest);
            dataQualityService.analyzePublishedData();
            jobService.markPublished(jobId);
            return new PublishExtractionResponseDto(
                    response.documentId(),
                    response.publishedEntityIds(),
                    response.publishedRelationIds(),
                    jobId
            );
        } catch (Exception exception) {
            jobService.markFailed(jobId, exception);
            throw exception;
        }
    }

    private DocumentExtractionResultDto canceledExtraction(String documentId) {
        return new DocumentExtractionResultDto(
                documentId,
                List.of(),
                List.of(),
                List.of(),
                List.of("Обработка отменена пользователем."),
                null
        );
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
        List<String> issueIds = safeEntities(request).stream()
                .filter(entity -> entity.type() == MentionableEntityType.DATA_ISSUE)
                .map(ExtractedEntityDto::id)
                .toList();

        document.setMaterialIdsJson(json.write(materialIds));
        document.setExperimentIdsJson(json.write(experimentIds));
        document.setIssueIdsJson(json.write(issueIds));
        document.setStatus(DocumentStatus.READY);
        documentRepository.save(document);

        safeEntities(request).forEach(entity -> {
            KnowledgeEntityRecord knowledgeEntity = saveKnowledgeEntity(
                    request.documentId(),
                    entity
            );
            replaceFacts(request.documentId(), entity, knowledgeEntity);
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
        KnowledgeEntityRecord existing = knowledgeEntityRepository.findById(entity.id()).orElse(null);
        int nextVersion = existing == null ? 1 : existing.getVersion() + 1;
        List<com.github.danbel.api.dto.common.SourceReferenceDto> sources =
                existing == null
                        ? new java.util.ArrayList<>()
                        : new java.util.ArrayList<>(json.readList(
                                existing.getSourcesJson(),
                                new TypeReference<List<com.github.danbel.api.dto.common.SourceReferenceDto>>() {
                                }
                        ));
        if (entity.source() != null && sources.stream().noneMatch(source ->
                java.util.Objects.equals(source.documentId(), entity.source().documentId())
                        && java.util.Objects.equals(source.page(), entity.source().page())
                        && java.util.Objects.equals(source.chunkId(), entity.source().chunkId()))) {
            sources.add(entity.source());
        }
        return KnowledgeEntityRecord.builder()
                .id(entity.id())
                .type(entity.type())
                .title(entity.name())
                .subtitle(subtitle(entity.type()))
                .description("Сущность извлечена из документа " + documentId + ".")
                .positionX(existing == null ? 180.0 + (index % 4) * 310 : existing.getPositionX())
                .positionY(existing == null ? 120.0 + (index / 4) * 180 : existing.getPositionY())
                .attributesJson(json.write(entity.attributes() == null ? List.of() : entity.attributes()))
                .sourcesJson(json.write(sources))
                .confidence(entity.confidence() == null ? 0.7 : entity.confidence())
                .verificationStatus("REVIEWED")
                .geography(entity.geography())
                .publicationYear(entity.year())
                .language(entity.language())
                .version(nextVersion)
                .updatedAt(OffsetDateTime.now())
                .build();
    }

    private KnowledgeEntityRecord saveKnowledgeEntity(
            String documentId,
            ExtractedEntityDto entity
    ) {
        boolean exists = knowledgeEntityRepository.existsById(entity.id());
        KnowledgeEntityRecord record = knowledgeEntityRepository.save(
                toKnowledgeEntity(documentId, entity)
        );
        String versionId = "version-" + UUID.nameUUIDFromBytes(
                (record.getId() + ":" + record.getVersion()).getBytes(StandardCharsets.UTF_8)
        );
        knowledgeEntityVersionRepository.save(KnowledgeEntityVersionEntity.builder()
                .id(versionId)
                .entity(record)
                .version(record.getVersion())
                .changeType(exists ? "UPDATED" : "CREATED")
                .changeMessage("Публикация документа " + documentId)
                .snapshotJson(json.write(new KnowledgeSnapshot(
                        record.getType(),
                        record.getTitle(),
                        record.getDescription(),
                        record.getAttributesJson(),
                        record.getSourcesJson(),
                        record.getConfidence(),
                        record.getVerificationStatus(),
                        record.getGeography(),
                        record.getPublicationYear(),
                        record.getLanguage()
                )))
                .changedAt(record.getUpdatedAt())
                .build());
        return record;
    }

    private void replaceFacts(
            String documentId,
            ExtractedEntityDto extracted,
            KnowledgeEntityRecord entity
    ) {
        // A knowledge entity can be confirmed by several documents. Re-publishing
        // one document must only replace facts extracted from that document.
        knowledgeFactRepository.deleteAllByEntity_IdAndSourceDocumentId(
                entity.getId(),
                documentId
        );
        OffsetDateTime now = OffsetDateTime.now();
        List<com.github.danbel.api.dto.common.EntityAttributeDto> attributes =
                extracted.attributes() == null ? List.of() : extracted.attributes();
        for (int index = 0; index < attributes.size(); index++) {
            var attribute = attributes.get(index);
            String factId = "fact-" + UUID.nameUUIDFromBytes(
                    (documentId + ":" + entity.getId() + ":" + attribute.name() + ":" + index)
                            .getBytes(StandardCharsets.UTF_8)
            );
            knowledgeFactRepository.save(KnowledgeFactEntity.builder()
                    .id(factId)
                    .entity(entity)
                    .name(attribute.name())
                    .operator(attribute.operator())
                    .numericValue(attribute.numericValue())
                    .minValue(attribute.minValue())
                    .maxValue(attribute.maxValue())
                    .unit(attribute.unit())
                    .normalizedUnit(attribute.normalizedUnit())
                    .textValue(String.valueOf(attribute.value()))
                    .sourceDocumentId(documentId)
                    .sourcePage(extracted.source() == null ? null : extracted.source().page())
                    .confidence(extracted.confidence() == null ? 0.7 : extracted.confidence())
                    .createdAt(now)
                    .updatedAt(now)
                    .build());
        }
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
                .coolingMethod(findAttributeWithUnit(
                        entity,
                        "охлаж",
                        findAttributeWithUnit(entity, "cooling", "Не указано")
                ))
                .property(property == null ? "Свойство не указано" : property.name())
                .valueBefore("—")
                .valueAfter("—")
                .effect("—")
                .equipmentId(null)
                .equipment("Не указано")
                .teamId("unknown-team")
                .team("Не указано")
                .date(entity.year() == null
                        ? LocalDate.now()
                        : LocalDate.of(entity.year(), 1, 1))
                .sourceDocumentId(request.documentId())
                .sourceName(document.getTitle())
                .sourcePage(entity.source() == null ? null : entity.source().page())
                .confidence(entity.confidence() == null ? 0.7 : entity.confidence())
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
        draft.setVisualFragmentsJson(json.write(
                extraction.visualFragments() == null
                        ? List.of()
                        : extraction.visualFragments()
        ));
        draft.setWarningsJson(json.write(extraction.warnings() == null ? List.of() : extraction.warnings()));
        extractionDraftRepository.save(draft);
    }

    private DocumentExtractionResultDto toExtractionResult(ExtractionDraftEntity draft) {
        return new DocumentExtractionResultDto(
                draft.getDocumentId(),
                json.readList(draft.getEntitiesJson(), EXTRACTED_ENTITIES),
                json.readList(draft.getRelationsJson(), EXTRACTED_RELATIONS),
                json.readList(draft.getVisualFragmentsJson(), VISUAL_FRAGMENTS),
                json.readList(draft.getWarningsJson(), STRING_LIST),
                getStoredTokenUsage(draft.getDocumentId())
        );
    }

    private List<ModelTokenUsageDto> getStoredTokenUsage(
            String documentId
    ) {
        return documentRepository.findById(documentId)
                .map(DocumentEntity::getProcessingTokenUsageJson)
                .map(value -> json.readList(
                        value,
                        new TypeReference<List<ModelTokenUsageDto>>() {
                        }
                ))
                .orElseGet(List::of);
    }

    private List<VisualFragmentDto> getStoredVisualFragments(String documentId) {
        return extractionDraftRepository.findByDocumentId(documentId)
                .map(ExtractionDraftEntity::getVisualFragmentsJson)
                .map(value -> json.readList(value, VISUAL_FRAGMENTS))
                .orElseGet(List::of);
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
            case PROCESS -> "Процесс";
            case PUBLICATION -> "Публикация";
            case EXPERT -> "Эксперт";
            case FACILITY -> "Площадка";
            case TECHNOLOGY -> "Технологическое решение";
            case GEOGRAPHY -> "География";
            case ECONOMIC_INDICATOR -> "Экономический показатель";
            case UNCLASSIFIED -> "Неопределенная сущность";
        };
    }

    private Integer findIntegerAttribute(ExtractedEntityDto entity, String name) {
        if (entity.attributes() == null) {
            return null;
        }
        return entity.attributes().stream()
                .filter(attribute -> attribute.name().toLowerCase(Locale.ROOT).contains(name))
                .map(attribute -> {
                    if (attribute.numericValue() != null) {
                        return attribute.numericValue().intValue();
                    }
                    if (attribute.value() instanceof Number number) {
                        return number.intValue();
                    }
                    return null;
                })
                .filter(java.util.Objects::nonNull)
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
                .map(attribute -> attribute.numericValue() == null
                        ? String.valueOf(attribute.value())
                        : formatNumber(attribute.numericValue())
                                + (attribute.unit() == null ? "" : " " + attribute.unit()))
                .orElse(fallback);
    }

    private String formatNumber(Double value) {
        return value % 1 == 0
                ? String.valueOf(value.intValue())
                : String.valueOf(value);
    }

    private DocumentType resolveType(String filename) {
        if (filename == null || !filename.contains(".")) {
            return DocumentType.PDF;
        }
        return switch (filename.substring(filename.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT)) {
            case "docx" -> DocumentType.DOCX;
            case "pptx" -> DocumentType.PPTX;
            case "xlsx" -> DocumentType.XLSX;
            case "csv" -> DocumentType.CSV;
            case "html", "htm" -> DocumentType.HTML;
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

    public record DocumentDownload(
            String filename,
            String contentType,
            long size,
            InputStream content
    ) {
    }

    private record KnowledgeSnapshot(
            MentionableEntityType type,
            String title,
            String description,
            String attributesJson,
            String sourcesJson,
            Double confidence,
            String verificationStatus,
            String geography,
            Integer year,
            String language
    ) {
    }
}
