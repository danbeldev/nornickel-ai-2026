package com.github.danbel.api.service;

import com.github.danbel.api.dto.material.MaterialRecordDto;
import com.github.danbel.api.exception.ResourceNotFoundException;
import com.github.danbel.api.mapper.ApiDtoMapper;
import com.github.danbel.api.repository.MaterialRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MaterialService {

    private final MaterialRepository repository;
    private final ApiDtoMapper mapper;

    public List<MaterialRecordDto> getMaterials() {
        return repository.findAll().stream().map(mapper::toMaterial).toList();
    }

    public MaterialRecordDto getMaterial(String materialId) {
        return repository.findById(materialId)
                .map(mapper::toMaterial)
                .orElseThrow(() -> new ResourceNotFoundException("Material not found: " + materialId));
    }
}
