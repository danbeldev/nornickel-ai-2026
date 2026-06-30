package com.github.danbel.api.service;

import com.github.danbel.api.dto.graph.KnowledgeGraphDataDto;
import com.github.danbel.api.exception.ResourceNotFoundException;
import com.github.danbel.api.mapper.ApiDtoMapper;
import com.github.danbel.api.model.entity.KnowledgeConnectionEntity;
import com.github.danbel.api.model.entity.KnowledgeEntityRecord;
import com.github.danbel.api.repository.KnowledgeConnectionRepository;
import com.github.danbel.api.repository.KnowledgeEntityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class KnowledgeGraphService {

    private final KnowledgeEntityRepository entityRepository;
    private final KnowledgeConnectionRepository connectionRepository;
    private final ApiDtoMapper mapper;

    public KnowledgeGraphDataDto getGraph() {
        return new KnowledgeGraphDataDto(
                entityRepository.findAll().stream().map(mapper::toKnowledgeEntity).toList(),
                connectionRepository.findAll().stream().map(mapper::toKnowledgeConnection).toList()
        );
    }

    public KnowledgeGraphDataDto getPreview() {
        var entities = entityRepository.findAll().stream().limit(8).toList();
        Set<String> ids = entities.stream().map(KnowledgeEntityRecord::getId).collect(Collectors.toSet());
        var connections = connectionRepository.findAll().stream()
                .filter(connection -> ids.contains(connection.getSource()) && ids.contains(connection.getTarget()))
                .toList();

        return new KnowledgeGraphDataDto(
                entities.stream().map(mapper::toKnowledgeEntity).toList(),
                connections.stream().map(mapper::toKnowledgeConnection).toList()
        );
    }

    public KnowledgeEntityRecord getEntityRecord(String entityId) {
        return entityRepository.findById(entityId)
                .orElseThrow(() -> new ResourceNotFoundException("Knowledge entity not found: " + entityId));
    }

    public void saveEntity(KnowledgeEntityRecord entity) {
        entityRepository.save(entity);
    }

    public void saveConnection(KnowledgeConnectionEntity connection) {
        connectionRepository.save(connection);
    }
}
