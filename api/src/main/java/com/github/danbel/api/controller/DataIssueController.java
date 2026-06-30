package com.github.danbel.api.controller;

import com.github.danbel.api.dto.issue.DataIssueRecordDto;
import com.github.danbel.api.service.DataIssueService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/data-issues")
public class DataIssueController {

    private final DataIssueService service;

    @GetMapping
    public List<DataIssueRecordDto> getIssues() {
        return service.getIssues();
    }

    @GetMapping("/recent")
    public List<DataIssueRecordDto> getRecentIssues(@RequestParam(defaultValue = "5") int limit) {
        return service.getRecentIssues(limit);
    }

    @GetMapping("/{issueId}")
    public DataIssueRecordDto getIssue(@PathVariable String issueId) {
        return service.getIssue(issueId);
    }
}
