package com.github.danbel.api.repository;

import com.github.danbel.api.model.entity.DocumentEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DocumentRepository extends JpaRepository<DocumentEntity, String> {
    List<DocumentEntity> findAllByOrderByIndexedAtDesc();
}
