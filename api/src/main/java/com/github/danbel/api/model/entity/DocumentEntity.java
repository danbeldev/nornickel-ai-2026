package com.github.danbel.api.model.entity;

import com.github.danbel.api.model.enums.DocumentStatus;
import com.github.danbel.api.model.enums.DocumentType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "documents")
public class DocumentEntity {

    @Id
    private String id;

    @Column(nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DocumentType type;

    @Column(nullable = false)
    private Integer year;

    @Column(nullable = false)
    private String author;

    @Column(nullable = false, columnDefinition = "text")
    private String description;

    private Integer pages;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DocumentStatus status;

    @Column(name = "indexed_at", nullable = false)
    private OffsetDateTime indexedAt;

    @Column(name = "extracted_entities", nullable = false)
    private Integer extractedEntities;

    @Column(name = "storage_key")
    private String storageKey;

    @Column(name = "source_hash")
    private String sourceHash;

    @Column(name = "source_url", length = 2048)
    private String sourceUrl;

    @Column(name = "published_at")
    private OffsetDateTime publishedAt;

    @Column(name = "experiment_ids_json", nullable = false, columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private String experimentIdsJson;

    @Column(name = "material_ids_json", nullable = false, columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private String materialIdsJson;

    @Column(name = "issue_ids_json", nullable = false, columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private String issueIdsJson;
}
