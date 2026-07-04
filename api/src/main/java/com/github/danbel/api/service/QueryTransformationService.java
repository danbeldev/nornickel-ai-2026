package com.github.danbel.api.service;

import com.github.danbel.api.dto.chat.EntityMentionDto;
import com.github.danbel.api.dto.common.ModelTokenUsageDto;
import com.github.danbel.api.model.enums.ChatProcessingStage;
import com.github.danbel.api.model.enums.ChatReasoningMode;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.ai.rag.Query;
import org.springframework.ai.rag.preretrieval.query.transformation.CompressionQueryTransformer;
import org.springframework.ai.rag.preretrieval.query.transformation.RewriteQueryTransformer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.LinkedHashSet;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.function.Consumer;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class QueryTransformationService {

    private static final Pattern ENTITY_ID = Pattern.compile(
            "(?iu)(?<![\\p{L}\\p{N}])[\\p{L}]{1,12}-\\d{1,10}(?![\\p{L}\\p{N}])"
    );
    private static final Pattern NUMBER = Pattern.compile(
            "(?<![\\p{L}\\p{N}])-?\\d+(?:[.,]\\d+)?"
    );
    private static final Pattern FOLLOW_UP_REFERENCE = Pattern.compile(
            "(?iu)\\b(он|она|оно|они|его|её|ее|их|этот|эта|это|эти|там|"
                    + "первый|второй|последний|предыдущий|такой|такая|такие|"
                    + "кто из них|какой из них|что насч[её]т)\\b"
    );
    private static final Pattern FACT_LOOKUP = Pattern.compile(
            "(?iu)^\\s*(кто|кем|когда|где|откуда|что\\s+такое|"
                    + "для\\s+(кого|каких)|кому|чей|чья|"
                    + "каков(а|ы)?|сколько|из\\s+(скольких|чего)|"
                    + "какие\\s+(темы|этапы|компоненты|элементы|"
                    + "преимущества|недостатки|блоки|модули|результаты)|"
                    + "в\\s+каком\\s+году|в\\s+каком\\s+месте|"
                    + "who|when|where|what\\s+is)\\b"
    );
    private static final Pattern ANALYTICAL_QUERY = Pattern.compile(
            "(?iu)\\b(сравни|проанализируй|исследуй|кто\\s+из|покажи\\s+все|"
                    + "перечисли\\s+все|противореч|пробел|тенденц|"
                    + "рекоменд|почему|как\\s+влияет|compare|analy[sz]e|"
                    + "contradiction|gap|trend|recommend)\\b"
    );

    private final ChatMemory chatMemory;
    private final ChatModel chatModel;
    private final StructuredQueryParser structuredQueryParser;
    private final String queryModel;
    private final int longQueryWords;
    private final int longQueryCharacters;

    public QueryTransformationService(
            ChatMemory chatMemory,
            ChatModel chatModel,
            StructuredQueryParser structuredQueryParser,
            @Value("${app.query-pipeline.model:${spring.ai.openai.chat.options.model}}")
            String queryModel,
            @Value("${app.query-pipeline.long-query-words:18}")
            int longQueryWords,
            @Value("${app.query-pipeline.long-query-characters:140}")
            int longQueryCharacters
    ) {
        this.chatMemory = chatMemory;
        this.chatModel = chatModel;
        this.structuredQueryParser = structuredQueryParser;
        this.queryModel = queryModel;
        this.longQueryWords = longQueryWords;
        this.longQueryCharacters = longQueryCharacters;
    }

    public QueryPlan plan(
            String chatId,
            String originalQuery,
            List<EntityMentionDto> mentions,
            ChatReasoningMode requestedReasoningMode,
            Consumer<QueryPipelineEvent> eventConsumer
    ) {
        ChatReasoningMode reasoningMode = requestedReasoningMode == null
                ? ChatReasoningMode.AUTO
                : requestedReasoningMode;
        List<Message> history = chatMemory.get(chatId);
        Set<String> currentIds = extractEntityIds(originalQuery);
        Set<String> currentNumbers = extractNumbers(originalQuery);
        boolean hasExactAnchors = !currentIds.isEmpty()
                || !currentNumbers.isEmpty()
                || (mentions != null && !mentions.isEmpty());

        emit(eventConsumer, ChatProcessingStage.CLASSIFYING_QUERY, null);
        QueryTransformationType transformation = classify(originalQuery, history, hasExactAnchors);
        emit(
                eventConsumer,
                ChatProcessingStage.QUERY_CLASSIFIED,
                classificationMessage(transformation, hasExactAnchors)
        );

        String transformedQuery = originalQuery;
        String rejectionReason = null;
        List<ModelTokenUsageDto> tokenUsage = new ArrayList<>();
        if (transformation != QueryTransformationType.NONE) {
            emit(
                    eventConsumer,
                    transformation == QueryTransformationType.COMPRESSION
                            ? ChatProcessingStage.COMPRESSING_QUERY
                            : ChatProcessingStage.REWRITING_QUERY,
                    "Используется модель " + queryModel
            );
            try {
                TransformationResult transformationResult = transform(
                        transformation,
                        originalQuery,
                        history
                );
                transformedQuery = transformationResult.query();
                tokenUsage.addAll(transformationResult.tokenUsage());
                emit(eventConsumer, ChatProcessingStage.VALIDATING_QUERY, null);

                Set<String> requiredIds = new LinkedHashSet<>(currentIds);
                if (transformation == QueryTransformationType.COMPRESSION) {
                    requiredIds.addAll(extractEntityIds(lastUserMessage(history)));
                }
                rejectionReason = validate(transformedQuery, requiredIds, currentNumbers);
                if (rejectionReason != null) {
                    transformedQuery = originalQuery;
                    emit(
                            eventConsumer,
                            ChatProcessingStage.TRANSFORMATION_REJECTED,
                            rejectionReason + " Используется исходный запрос."
                    );
                }
            } catch (Exception exception) {
                transformedQuery = originalQuery;
                rejectionReason = "Преобразование не выполнено: "
                        + rootMessage(exception)
                        + ".";
                emit(
                        eventConsumer,
                        ChatProcessingStage.TRANSFORMATION_REJECTED,
                        rejectionReason + " Используется исходный запрос."
                );
            }
        }

        boolean finalHasAnchors = hasExactAnchors || !extractEntityIds(transformedQuery).isEmpty();
        StructuredQueryParser.ParsedQuery parsedQuery = structuredQueryParser.parse(originalQuery);
        boolean autoCompactFactLookup = isCompactFactLookup(originalQuery)
                && !parsedQuery.filters().active();
        boolean compactFactLookup = switch (reasoningMode) {
            case NORMAL -> true;
            case RESEARCH -> false;
            case AUTO -> autoCompactFactLookup;
        };
        int graphDepth = switch (reasoningMode) {
            case NORMAL -> 1;
            case RESEARCH -> 4;
            case AUTO -> finalHasAnchors || compactFactLookup ? 1 : 4;
        };
        emit(
                eventConsumer,
                ChatProcessingStage.QUERY_READY,
                "Глубина графа: " + graphDepth
                        + ". Режим рассуждения: "
                        + reasoningModeLabel(reasoningMode)
                        + ". Профиль поиска: "
                        + (compactFactLookup ? "компактный фактологический" : "исследовательский")
                        + ". Режим ответа: " + parsedQuery.responseMode().name().toLowerCase(Locale.ROOT)
                        + ". Строгих фильтров: "
                        + (parsedQuery.filters().active() ? "есть" : "нет")
                        + ". Запрос поиска: «" + transformedQuery.strip() + "»"
        );
        return new QueryPlan(
                originalQuery,
                transformedQuery,
                reasoningMode,
                transformation,
                graphDepth,
                parsedQuery.filters(),
                parsedQuery.responseMode(),
                compactFactLookup,
                transformation != QueryTransformationType.NONE && rejectionReason == null,
                rejectionReason,
                ModelTokenUsageAggregator.merge(tokenUsage)
        );
    }

    private QueryTransformationType classify(
            String query,
            List<Message> history,
            boolean hasExactAnchors
    ) {
        if (!hasExactAnchors && !history.isEmpty() && isFollowUp(query)) {
            return QueryTransformationType.COMPRESSION;
        }
        if (!hasExactAnchors && isLong(query)) {
            return QueryTransformationType.REWRITE;
        }
        return QueryTransformationType.NONE;
    }

    private boolean isFollowUp(String query) {
        String normalized = query.strip().toLowerCase(Locale.ROOT);
        int words = wordCount(query);
        return FOLLOW_UP_REFERENCE.matcher(normalized).find()
                || (normalized.startsWith("а ") && words <= 12)
                || (words <= 5 && normalized.matches(
                        "^(почему|как|какой|какая|какие|который|которая|что именно)(\\s.*)?$"
                ));
    }

    private boolean isLong(String query) {
        return query.length() >= longQueryCharacters || wordCount(query) >= longQueryWords;
    }

    private boolean isCompactFactLookup(String query) {
        return wordCount(query) <= 14
                && FACT_LOOKUP.matcher(query).find()
                && !ANALYTICAL_QUERY.matcher(query).find();
    }

    private int wordCount(String value) {
        String stripped = value.strip();
        return stripped.isEmpty() ? 0 : stripped.split("\\s+").length;
    }

    private TransformationResult transform(
            QueryTransformationType transformation,
            String query,
            List<Message> history
    ) {
        List<ModelTokenUsageDto> tokenUsage = new ArrayList<>();
        ChatModel trackingModel = prompt -> {
            ChatResponse response = chatModel.call(prompt);
            tokenUsage.addAll(
                    ModelTokenUsageAggregator.fromResponse(response, queryModel)
            );
            return response;
        };
        ChatClient.Builder builder = ChatClient.builder(trackingModel)
                .defaultOptions(ChatOptions.builder()
                        .model(queryModel)
                        .temperature(0.0));
        Query springQuery = Query.builder()
                .text(query)
                .history(history)
                .build();
        Query result = transformation == QueryTransformationType.COMPRESSION
                ? CompressionQueryTransformer.builder()
                        .chatClientBuilder(builder)
                        .build()
                        .transform(springQuery)
                : RewriteQueryTransformer.builder()
                        .chatClientBuilder(builder)
                        .targetSearchSystem("граф знаний Neo4j по материаловедению")
                        .build()
                        .transform(springQuery);
        if (result == null || result.text() == null || result.text().isBlank()) {
            throw new IllegalStateException("модель вернула пустой запрос");
        }
        return new TransformationResult(
                result.text().strip(),
                ModelTokenUsageAggregator.merge(tokenUsage)
        );
    }

    private String validate(
            String transformedQuery,
            Set<String> requiredIds,
            Set<String> requiredNumbers
    ) {
        Set<String> resultIds = extractEntityIds(transformedQuery);
        Set<String> resultNumbers = extractNumbers(transformedQuery);
        Set<String> missingIds = difference(requiredIds, resultIds);
        Set<String> missingNumbers = difference(requiredNumbers, resultNumbers);
        if (missingIds.isEmpty() && missingNumbers.isEmpty()) {
            return null;
        }

        StringBuilder reason = new StringBuilder("Преобразованный запрос потерял");
        if (!missingIds.isEmpty()) {
            reason.append(" ID: ").append(String.join(", ", missingIds));
        }
        if (!missingNumbers.isEmpty()) {
            if (!missingIds.isEmpty()) {
                reason.append(";");
            }
            reason.append(" числа: ").append(String.join(", ", missingNumbers));
        }
        reason.append(".");
        return reason.toString();
    }

    private Set<String> extractEntityIds(String text) {
        Set<String> result = new LinkedHashSet<>();
        if (text == null) {
            return result;
        }
        Matcher matcher = ENTITY_ID.matcher(text);
        while (matcher.find()) {
            result.add(matcher.group().toUpperCase(Locale.ROOT));
        }
        return result;
    }

    private Set<String> extractNumbers(String text) {
        Set<String> result = new LinkedHashSet<>();
        if (text == null) {
            return result;
        }
        String withoutIds = ENTITY_ID.matcher(text).replaceAll(" ");
        Matcher matcher = NUMBER.matcher(withoutIds);
        while (matcher.find()) {
            result.add(normalizeNumber(matcher.group()));
        }
        return result;
    }

    private String normalizeNumber(String value) {
        return value.replace(',', '.').replaceFirst("^(-?)0+(\\d)", "$1$2");
    }

    private Set<String> difference(Set<String> required, Set<String> actual) {
        Set<String> result = new LinkedHashSet<>(required);
        result.removeAll(actual);
        return result;
    }

    private String lastUserMessage(List<Message> history) {
        for (int index = history.size() - 1; index >= 0; index--) {
            Message message = history.get(index);
            if (message instanceof UserMessage) {
                return message.getText();
            }
        }
        return "";
    }

    private String classificationMessage(
            QueryTransformationType transformation,
            boolean hasExactAnchors
    ) {
        return switch (transformation) {
            case COMPRESSION -> "Уточняющий запрос: контекст диалога будет сжат в самостоятельный запрос.";
            case REWRITE -> "Длинный запрос без точных якорей: формулировка будет оптимизирована для поиска.";
            case NONE -> hasExactAnchors
                    ? "Точный запрос с якорями: преобразование не требуется."
                    : "Короткий самостоятельный запрос: преобразование не требуется.";
        };
    }

    private String reasoningModeLabel(ChatReasoningMode mode) {
        return switch (mode) {
            case AUTO -> "авто";
            case NORMAL -> "обычный";
            case RESEARCH -> "исследовательский";
        };
    }

    private void emit(
            Consumer<QueryPipelineEvent> consumer,
            ChatProcessingStage stage,
            String message
    ) {
        consumer.accept(new QueryPipelineEvent(stage, message));
    }

    private String rootMessage(Throwable throwable) {
        Throwable current = throwable;
        while (current.getCause() != null) {
            current = current.getCause();
        }
        String message = current.getMessage();
        return message == null || message.isBlank()
                ? current.getClass().getSimpleName()
                : message;
    }

    private record TransformationResult(
            String query,
            List<ModelTokenUsageDto> tokenUsage
    ) {
    }
}
