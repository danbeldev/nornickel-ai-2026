package com.github.danbel.api.service;

import com.github.danbel.api.dto.search.SearchKnowledgeResponseDto;
import com.github.danbel.api.repository.DocumentRepository;
import com.github.danbel.api.repository.ExperimentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Locale;

@Service
@RequiredArgsConstructor
public class KnowledgeSearchService {

    private final ExperimentRepository experimentRepository;
    private final DocumentRepository documentRepository;

    public SearchKnowledgeResponseDto search(String query) {
        String normalized = query == null ? "" : query.toLowerCase(Locale.ROOT);
        int experimentCount = (int) experimentRepository.findAll().stream()
                .filter(experiment -> contains(experiment.getTitle(), normalized)
                        || contains(experiment.getMaterial(), normalized)
                        || contains(experiment.getProperty(), normalized)
                        || contains(experiment.getNotes(), normalized))
                .count();
        int documentCount = (int) documentRepository.findAll().stream()
                .filter(document -> contains(document.getTitle(), normalized)
                        || contains(document.getAuthor(), normalized)
                        || contains(document.getDescription(), normalized))
                .count();

        return new SearchKnowledgeResponseDto(query, experimentCount, documentCount);
    }

    private boolean contains(String value, String query) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(query);
    }
}
