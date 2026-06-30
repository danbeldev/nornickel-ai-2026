package com.github.danbel.api.repository;

import com.github.danbel.api.model.entity.KnowledgeEntityRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface KnowledgeEntityRepository extends JpaRepository<KnowledgeEntityRecord, String> {
    List<KnowledgeEntityRecord> findByTitleContainingIgnoreCaseOrSubtitleContainingIgnoreCase(String title, String subtitle);
}
