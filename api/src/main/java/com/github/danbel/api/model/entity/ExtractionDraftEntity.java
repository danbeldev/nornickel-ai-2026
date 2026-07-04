package com.github.danbel.api.model.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "extraction_drafts")
public class ExtractionDraftEntity {

    @Id
    private String id;

    @Column(name = "document_id", nullable = false, unique = true)
    private String documentId;

    @Column(name = "entities_json", nullable = false, columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private String entitiesJson;

    @Column(name = "relations_json", nullable = false, columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private String relationsJson;

    @Column(name = "visual_fragments_json", nullable = false, columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private String visualFragmentsJson;

    @Column(name = "warnings_json", nullable = false, columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private String warningsJson;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;
}
