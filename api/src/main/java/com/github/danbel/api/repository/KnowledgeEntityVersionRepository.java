package com.github.danbel.api.repository;

import com.github.danbel.api.model.entity.KnowledgeEntityVersionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface KnowledgeEntityVersionRepository extends JpaRepository<KnowledgeEntityVersionEntity, String> {
    List<KnowledgeEntityVersionEntity> findAllByEntity_IdOrderByVersionDesc(String entityId);
}
