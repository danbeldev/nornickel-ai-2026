package com.github.danbel.api.repository;

import com.github.danbel.api.model.entity.DataIssueEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DataIssueRepository extends JpaRepository<DataIssueEntity, String> {
    List<DataIssueEntity> findAllByOrderByDetectedAtDesc();
}
