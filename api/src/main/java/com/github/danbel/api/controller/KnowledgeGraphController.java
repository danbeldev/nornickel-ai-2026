package com.github.danbel.api.controller;

import com.github.danbel.api.dto.graph.KnowledgeGraphDataDto;
import com.github.danbel.api.dto.graph.KnowledgeGraphEntityDto;
import com.github.danbel.api.dto.graph.KnowledgeFactDto;
import com.github.danbel.api.dto.graph.KnowledgeEntityVersionDto;
import com.github.danbel.api.dto.graph.UpdateKnowledgeEntityRequestDto;
import com.github.danbel.api.dto.graph.UpdateKnowledgeConnectionRequestDto;
import com.github.danbel.api.dto.graph.MergeKnowledgeEntitiesRequestDto;
import com.github.danbel.api.dto.graph.KnowledgeGraphConnectionDto;
import com.github.danbel.api.dto.graph.CreateKnowledgeConnectionRequestDto;
import jakarta.validation.Valid;
import com.github.danbel.api.service.KnowledgeGraphService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/knowledge-graph")
public class KnowledgeGraphController {

    private final KnowledgeGraphService service;

    @GetMapping
    public KnowledgeGraphDataDto getKnowledgeGraph() {
        return service.getGraph();
    }

    @GetMapping("/preview")
    public KnowledgeGraphDataDto getKnowledgeGraphPreview() {
        return service.getPreview();
    }

    @GetMapping("/entities/{entityId}")
    public KnowledgeGraphEntityDto getEntity(@PathVariable String entityId) {
        return service.getEntity(entityId);
    }

    @GetMapping("/entities/{entityId}/facts")
    public List<KnowledgeFactDto> getFacts(@PathVariable String entityId) {
        return service.getFacts(entityId);
    }

    @GetMapping("/entities/{entityId}/versions")
    public List<KnowledgeEntityVersionDto> getVersions(@PathVariable String entityId) {
        return service.getVersions(entityId);
    }

    @PutMapping("/entities/{entityId}")
    public KnowledgeGraphEntityDto updateEntity(
            @PathVariable String entityId,
            @Valid @org.springframework.web.bind.annotation.RequestBody
            UpdateKnowledgeEntityRequestDto request
    ) {
        return service.updateEntity(entityId, request);
    }

    @PostMapping("/entities/{entityId}/merge")
    public KnowledgeGraphEntityDto mergeEntity(
            @PathVariable String entityId,
            @Valid @org.springframework.web.bind.annotation.RequestBody
            MergeKnowledgeEntitiesRequestDto request
    ) {
        return service.mergeEntity(entityId, request);
    }

    @PutMapping("/connections/{connectionId}")
    public KnowledgeGraphConnectionDto updateConnection(
            @PathVariable String connectionId,
            @Valid @org.springframework.web.bind.annotation.RequestBody
            UpdateKnowledgeConnectionRequestDto request
    ) {
        return service.updateConnection(connectionId, request);
    }

    @PostMapping("/connections")
    public KnowledgeGraphConnectionDto createConnection(
            @Valid @org.springframework.web.bind.annotation.RequestBody
            CreateKnowledgeConnectionRequestDto request
    ) {
        return service.createConnection(request);
    }

    @DeleteMapping("/connections/{connectionId}")
    public void deleteConnection(
            @PathVariable String connectionId,
            @RequestParam(required = false) String changeMessage
    ) {
        service.deleteConnection(connectionId, changeMessage);
    }
}
