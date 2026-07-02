package com.github.danbel.api.model.entity;

import com.github.danbel.api.model.enums.MentionableEntityType;
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
@Table(name = "knowledge_entities")
public class KnowledgeEntityRecord {

    @Id
    private String id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MentionableEntityType type;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String subtitle;

    @Column(nullable = false, columnDefinition = "text")
    private String description;

    @Column(name = "position_x", nullable = false)
    private Double positionX;

    @Column(name = "position_y", nullable = false)
    private Double positionY;

    @Column(name = "attributes_json", nullable = false, columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private String attributesJson;

    @Column(name = "sources_json", nullable = false, columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private String sourcesJson;

    @Column(nullable = false)
    @Builder.Default
    private Double confidence = 0.7;

    @Column(name = "verification_status", nullable = false)
    @Builder.Default
    private String verificationStatus = "EXTRACTED";

    private String geography;

    @Column(name = "publication_year")
    private Integer publicationYear;

    private String language;

    @Column(nullable = false)
    @Builder.Default
    private Integer version = 1;

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private OffsetDateTime updatedAt = OffsetDateTime.now();
}
