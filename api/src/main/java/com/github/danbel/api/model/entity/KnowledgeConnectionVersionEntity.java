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

import java.time.OffsetDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "knowledge_connection_versions")
public class KnowledgeConnectionVersionEntity {
    @Id
    private String id;
    @Column(name = "connection_id", nullable = false)
    private String connectionId;
    @Column(name = "source_id", nullable = false)
    private String sourceId;
    @Column(name = "target_id", nullable = false)
    private String targetId;
    @Column(name = "relation_type", nullable = false)
    private String relationType;
    @Column(name = "change_type", nullable = false)
    private String changeType;
    @Column(name = "change_message", columnDefinition = "text")
    private String changeMessage;
    @Column(name = "changed_at", nullable = false)
    private OffsetDateTime changedAt;
}
