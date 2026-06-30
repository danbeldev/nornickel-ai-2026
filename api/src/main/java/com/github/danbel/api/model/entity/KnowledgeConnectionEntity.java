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

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "knowledge_connections")
public class KnowledgeConnectionEntity {

    @Id
    private String id;

    @Column(name = "source_id", nullable = false)
    private String source;

    @Column(name = "target_id", nullable = false)
    private String target;

    @Column(nullable = false)
    private String label;
}
