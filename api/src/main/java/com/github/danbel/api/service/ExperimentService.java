package com.github.danbel.api.service;

import com.github.danbel.api.dto.experiment.ExperimentRecordDto;
import com.github.danbel.api.exception.ResourceNotFoundException;
import com.github.danbel.api.mapper.ApiDtoMapper;
import com.github.danbel.api.repository.ExperimentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ExperimentService {

    private final ExperimentRepository repository;
    private final ApiDtoMapper mapper;

    public List<ExperimentRecordDto> getExperiments() {
        return repository.findAll().stream().map(mapper::toExperiment).toList();
    }

    public ExperimentRecordDto getExperiment(String experimentId) {
        return repository.findById(experimentId)
                .map(mapper::toExperiment)
                .orElseThrow(() -> new ResourceNotFoundException("Experiment not found: " + experimentId));
    }
}
