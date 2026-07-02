package com.github.danbel.api.service;

public record QueryPlan(
        String originalQuery,
        String retrievalQuery,
        QueryTransformationType transformation,
        int graphDepth,
        boolean transformed,
        String rejectionReason
) {
}
