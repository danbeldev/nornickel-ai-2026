package com.github.danbel.api.dto.experiment;

import java.time.LocalDate;

public record ExperimentRecordDto(
        String id,
        String title,
        String materialId,
        String material,
        String materialDetails,
        Integer temperature,
        String duration,
        String coolingMethod,
        String property,
        String valueBefore,
        String valueAfter,
        String effect,
        String equipmentId,
        String equipment,
        String teamId,
        String team,
        LocalDate date,
        String sourceDocumentId,
        String sourceName,
        Integer sourcePage,
        Double confidence,
        String notes
) {
}
