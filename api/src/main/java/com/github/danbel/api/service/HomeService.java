package com.github.danbel.api.service;

import com.github.danbel.api.dto.home.DashboardStatDto;
import com.github.danbel.api.dto.home.HomePageDataDto;
import com.github.danbel.api.model.enums.DocumentStatus;
import com.github.danbel.api.repository.DocumentRepository;
import com.github.danbel.api.repository.ExperimentRepository;
import com.github.danbel.api.repository.KnowledgeConnectionRepository;
import com.github.danbel.api.repository.KnowledgeEntityRepository;
import com.github.danbel.api.repository.MaterialRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class HomeService {

    private final DocumentRepository documentRepository;
    private final ExperimentRepository experimentRepository;
    private final MaterialRepository materialRepository;
    private final KnowledgeEntityRepository knowledgeEntityRepository;
    private final KnowledgeConnectionRepository knowledgeConnectionRepository;

    public HomePageDataDto getHomePageData() {
        long readyDocuments = documentRepository.findAll().stream()
                .filter(document -> document.getStatus() == DocumentStatus.READY)
                .count();
        long experiments = experimentRepository.count();
        long materials = materialRepository.count();
        long graphEntities = knowledgeEntityRepository.count();
        long graphRelations = knowledgeConnectionRepository.count();

        return new HomePageDataDto(
                List.of(
                        new DashboardStatDto("documents", "Документы", String.valueOf(documentRepository.count()), "Готовы к поиску: " + readyDocuments, "documents"),
                        new DashboardStatDto("experiments", "Эксперименты", String.valueOf(experiments), "Извлечены из документов и каталогов", "experiments"),
                        new DashboardStatDto("materials", "Материалы", String.valueOf(materials), "Связаны с экспериментами и источниками", "materials"),
                        new DashboardStatDto("relations", "Связи графа", String.valueOf(graphRelations), "Сущностей в графе: " + graphEntities, "relations")
                ),
                List.of(
                        "Как термообработка влияет на прочность сплава X?",
                        "Какие режимы исследовали для никелевых сплавов?",
                        "Где результаты экспериментов противоречат друг другу?"
                )
        );
    }
}
