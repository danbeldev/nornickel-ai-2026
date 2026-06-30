package com.github.danbel.api.controller;

import com.github.danbel.api.dto.material.MaterialRecordDto;
import com.github.danbel.api.service.MaterialService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/materials")
public class MaterialController {

    private final MaterialService service;

    @GetMapping
    public List<MaterialRecordDto> getMaterials() {
        return service.getMaterials();
    }

    @GetMapping("/{materialId}")
    public MaterialRecordDto getMaterial(@PathVariable String materialId) {
        return service.getMaterial(materialId);
    }
}
