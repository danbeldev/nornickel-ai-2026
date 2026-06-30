package com.github.danbel.api.repository;

import com.github.danbel.api.model.entity.IngestionJobEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface IngestionJobRepository extends JpaRepository<IngestionJobEntity, String> {
    List<IngestionJobEntity> findByDocumentIdOrderByCreatedAtDesc(String documentId);
}
