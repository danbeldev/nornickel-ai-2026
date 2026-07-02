package com.github.danbel.api.repository;

import com.github.danbel.api.model.entity.KnowledgeFactEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface KnowledgeFactRepository extends JpaRepository<KnowledgeFactEntity, String> {
    List<KnowledgeFactEntity> findAllByEntity_IdOrderByNameAsc(String entityId);
    void deleteAllByEntity_Id(String entityId);
    void deleteAllByEntity_IdAndSourceDocumentId(String entityId, String sourceDocumentId);
    void deleteAllByEntity_IdAndSourceDocumentIdIsNull(String entityId);
}
