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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "knowledge_entity_versions")
public class KnowledgeEntityVersionEntity {

    @Id
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "entity_id", nullable = false)
    private KnowledgeEntityRecord entity;

    @Column(nullable = false)
    private Integer version;

    @Column(name = "change_type", nullable = false)
    private String changeType;

    @Column(name = "change_message", columnDefinition = "text")
    private String changeMessage;

    @Column(name = "snapshot_json", nullable = false, columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private String snapshotJson;

    @Column(name = "changed_at", nullable = false)
    private OffsetDateTime changedAt;
}
