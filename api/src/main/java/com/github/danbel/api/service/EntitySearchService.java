package com.github.danbel.api.service;

import com.github.danbel.api.dto.entity.MentionableEntityDto;
import com.github.danbel.api.model.enums.MentionableEntityType;
import com.github.danbel.api.repository.DocumentRepository;
import com.github.danbel.api.repository.KnowledgeEntityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class EntitySearchService {

    private final KnowledgeEntityRepository knowledgeEntityRepository;
    private final DocumentRepository documentRepository;

    public List<MentionableEntityDto> search(String query, int limit) {
        String normalized = query == null ? "" : query.strip().toLowerCase(Locale.ROOT);

        Stream<MentionableEntityDto> graphEntities = knowledgeEntityRepository.findAll().stream()
                .filter(entity -> matches(entity.getTitle(), entity.getSubtitle(), normalized))
                .map(entity -> new MentionableEntityDto(entity.getId(), entity.getType(), entity.getTitle(), entity.getSubtitle()));

        Stream<MentionableEntityDto> documents = documentRepository.findAll().stream()
                .filter(document -> matches(document.getTitle(), document.getDescription(), normalized))
                .map(document -> new MentionableEntityDto(document.getId(), MentionableEntityType.DOCUMENT, document.getTitle(), document.getDescription()));

        return Stream.concat(graphEntities, documents)
                .sorted(Comparator.comparing(MentionableEntityDto::label))
                .limit(limit)
                .toList();
    }

    private boolean matches(String first, String second, String query) {
        if (query.isBlank()) {
            return true;
        }
        return contains(first, query) || contains(second, query);
    }

    private boolean contains(String value, String query) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(query);
    }
}
