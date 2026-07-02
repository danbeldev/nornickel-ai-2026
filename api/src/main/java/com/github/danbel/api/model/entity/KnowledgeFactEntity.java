package com.github.danbel.api.model.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "knowledge_facts")
public class KnowledgeFactEntity {

    @Id
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "entity_id", nullable = false)
    private KnowledgeEntityRecord entity;

    @Column(nullable = false)
    private String name;

    private String operator;

    @Column(name = "numeric_value")
    private Double numericValue;

    @Column(name = "min_value")
    private Double minValue;

    @Column(name = "max_value")
    private Double maxValue;

    private String unit;

    @Column(name = "normalized_unit")
    private String normalizedUnit;

    @Column(name = "text_value", columnDefinition = "text")
    private String textValue;

    @Column(name = "source_document_id")
    private String sourceDocumentId;

    @Column(name = "source_page")
    private Integer sourcePage;

    @Column(nullable = false)
    private Double confidence;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
