package com.github.danbel.api.repository;

import com.github.danbel.api.model.entity.KnowledgeConnectionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface KnowledgeConnectionRepository extends JpaRepository<KnowledgeConnectionEntity, String> {
}
