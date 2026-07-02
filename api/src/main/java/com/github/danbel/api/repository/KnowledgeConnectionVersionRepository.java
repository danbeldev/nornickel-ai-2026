package com.github.danbel.api.repository;

import com.github.danbel.api.model.entity.KnowledgeConnectionVersionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface KnowledgeConnectionVersionRepository
        extends JpaRepository<KnowledgeConnectionVersionEntity, String> {
}
