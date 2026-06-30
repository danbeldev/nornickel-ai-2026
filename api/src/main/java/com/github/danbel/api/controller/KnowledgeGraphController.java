package com.github.danbel.api.controller;

import com.github.danbel.api.dto.graph.KnowledgeGraphDataDto;
import com.github.danbel.api.service.KnowledgeGraphService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
}
