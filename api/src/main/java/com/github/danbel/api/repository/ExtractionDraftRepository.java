package com.github.danbel.api.repository;

import com.github.danbel.api.model.entity.ExtractionDraftEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ExtractionDraftRepository extends JpaRepository<ExtractionDraftEntity, String> {
    Optional<ExtractionDraftEntity> findByDocumentId(String documentId);
}
