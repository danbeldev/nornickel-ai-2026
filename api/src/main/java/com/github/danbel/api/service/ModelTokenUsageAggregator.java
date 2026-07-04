package com.github.danbel.api.service;

import com.github.danbel.api.dto.common.ModelTokenUsageDto;
import org.springframework.ai.chat.model.ChatResponse;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class ModelTokenUsageAggregator {

    private ModelTokenUsageAggregator() {
    }

    @SafeVarargs
    public static List<ModelTokenUsageDto> merge(List<ModelTokenUsageDto>... groups) {
        Map<String, MutableUsage> result = new LinkedHashMap<>();
        for (List<ModelTokenUsageDto> group : groups) {
            if (group == null) {
                continue;
            }
            for (ModelTokenUsageDto usage : group) {
                if (usage == null || usage.model() == null || usage.model().isBlank()) {
                    continue;
                }
                result.computeIfAbsent(usage.model(), ignored -> new MutableUsage())
                        .add(usage);
            }
        }
        List<ModelTokenUsageDto> usages = new ArrayList<>();
        result.forEach((model, usage) -> usages.add(usage.toDto(model)));
        return usages;
    }

    public static List<ModelTokenUsageDto> fromResponse(
            ChatResponse response,
            String fallbackModel
    ) {
        if (response == null || response.getMetadata() == null
                || response.getMetadata().getUsage() == null) {
            return List.of();
        }
        var metadata = response.getMetadata();
        var usage = metadata.getUsage();
        String model = metadata.getModel() == null || metadata.getModel().isBlank()
                ? fallbackModel
                : metadata.getModel();
        int prompt = value(usage.getPromptTokens());
        int completion = value(usage.getCompletionTokens());
        int total = usage.getTotalTokens() == null
                ? prompt + completion
                : value(usage.getTotalTokens());
        return List.of(new ModelTokenUsageDto(model, prompt, completion, total));
    }

    public static List<ModelTokenUsageDto> single(
            String model,
            Integer promptTokens,
            Integer completionTokens
    ) {
        if (model == null || model.isBlank()
                || (promptTokens == null && completionTokens == null)) {
            return List.of();
        }
        int prompt = value(promptTokens);
        int completion = value(completionTokens);
        return List.of(new ModelTokenUsageDto(
                model,
                prompt,
                completion,
                prompt + completion
        ));
    }

    private static int value(Integer value) {
        return value == null ? 0 : Math.max(0, value);
    }

    private static final class MutableUsage {
        private int promptTokens;
        private int completionTokens;
        private int totalTokens;

        void add(ModelTokenUsageDto usage) {
            promptTokens += value(usage.promptTokens());
            completionTokens += value(usage.completionTokens());
            totalTokens += usage.totalTokens() == null
                    ? value(usage.promptTokens()) + value(usage.completionTokens())
                    : value(usage.totalTokens());
        }

        ModelTokenUsageDto toDto(String model) {
            return new ModelTokenUsageDto(
                    model,
                    promptTokens,
                    completionTokens,
                    totalTokens
            );
        }
    }
}
