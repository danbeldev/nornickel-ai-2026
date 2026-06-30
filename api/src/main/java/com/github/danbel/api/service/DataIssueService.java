package com.github.danbel.api.service;

import com.github.danbel.api.dto.issue.DataIssueRecordDto;
import com.github.danbel.api.exception.ResourceNotFoundException;
import com.github.danbel.api.mapper.ApiDtoMapper;
import com.github.danbel.api.repository.DataIssueRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DataIssueService {

    private final DataIssueRepository repository;
    private final ApiDtoMapper mapper;

    public List<DataIssueRecordDto> getIssues() {
        return repository.findAllByOrderByDetectedAtDesc().stream().map(mapper::toDataIssue).toList();
    }

    public List<DataIssueRecordDto> getRecentIssues(int limit) {
        return repository.findAllByOrderByDetectedAtDesc().stream().limit(limit).map(mapper::toDataIssue).toList();
    }

    public DataIssueRecordDto getIssue(String issueId) {
        return repository.findById(issueId)
                .map(mapper::toDataIssue)
                .orElseThrow(() -> new ResourceNotFoundException("Data issue not found: " + issueId));
    }
}
