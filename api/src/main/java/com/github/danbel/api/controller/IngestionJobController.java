package com.github.danbel.api.controller;

import com.github.danbel.api.dto.job.IngestionJobDto;
import com.github.danbel.api.service.IngestionJobService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/jobs")
public class IngestionJobController {

    private final IngestionJobService service;

    @GetMapping("/{jobId}")
    public IngestionJobDto getJob(@PathVariable String jobId) {
        return service.getJob(jobId);
    }
}
