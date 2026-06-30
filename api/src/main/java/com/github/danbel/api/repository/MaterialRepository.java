package com.github.danbel.api.repository;

import com.github.danbel.api.model.entity.MaterialEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MaterialRepository extends JpaRepository<MaterialEntity, String> {
}
