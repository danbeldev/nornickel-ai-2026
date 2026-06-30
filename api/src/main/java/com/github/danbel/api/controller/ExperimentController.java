package com.github.danbel.api.controller;

import com.github.danbel.api.dto.experiment.ExperimentRecordDto;
import com.github.danbel.api.service.ExperimentService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/experiments")
public class ExperimentController {

    private final ExperimentService service;

    @GetMapping
    public List<ExperimentRecordDto> getExperiments() {
        return service.getExperiments();
    }

    @GetMapping("/{experimentId}")
    public ExperimentRecordDto getExperiment(@PathVariable String experimentId) {
        return service.getExperiment(experimentId);
    }
}
