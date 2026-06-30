package com.github.danbel.api.repository;

import com.github.danbel.api.model.entity.ExperimentEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExperimentRepository extends JpaRepository<ExperimentEntity, String> {
}
