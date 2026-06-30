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

import java.time.LocalDate;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "experiments")
public class ExperimentEntity {

    @Id
    private String id;

    @Column(nullable = false)
    private String title;

    @Column(name = "material_id", nullable = false)
    private String materialId;

    @Column(nullable = false)
    private String material;

    @Column(name = "material_details", nullable = false)
    private String materialDetails;

    private Integer temperature;

    @Column(nullable = false)
    private String duration;

    @Column(name = "cooling_method", nullable = false)
    private String coolingMethod;

    @Column(nullable = false)
    private String property;

    @Column(name = "value_before", nullable = false)
    private String valueBefore;

    @Column(name = "value_after", nullable = false)
    private String valueAfter;

    @Column(nullable = false)
    private String effect;

    @Column(name = "equipment_id")
    private String equipmentId;

    @Column(nullable = false)
    private String equipment;

    @Column(name = "team_id", nullable = false)
    private String teamId;

    @Column(nullable = false)
    private String team;

    @Column(nullable = false)
    private LocalDate date;

    @Column(name = "source_document_id", nullable = false)
    private String sourceDocumentId;

    @Column(name = "source_name", nullable = false)
    private String sourceName;

    @Column(name = "source_page")
    private Integer sourcePage;

    @Column(nullable = false)
    private Double confidence;

    @Column(nullable = false, columnDefinition = "text")
    private String notes;
}
