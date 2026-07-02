package com.github.danbel.api.service;

import com.github.danbel.api.client.dto.GraphRagRetrieveResponseDto;
import com.github.danbel.api.client.dto.GraphRagContextDto;
import com.github.danbel.api.client.dto.GraphRagMatchedEntityDto;
import com.github.danbel.api.client.dto.GraphRagPathDto;
import com.github.danbel.api.dto.chat.ChatEvidenceDto;
import com.github.danbel.api.dto.chat.EntityMentionDto;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatGenerationService {

    private final ObjectProvider<ChatClient.Builder> chatClientBuilderProvider;
    private final MessageChatMemoryAdvisor chatMemoryAdvisor;

    @Value("${spring.ai.ollama.chat.options.model:unknown}")
    private String configuredModel;

    public ChatGenerationResult generate(
            String chatId,
            QueryPlan queryPlan,
            List<EntityMentionDto> mentions,
            GraphRagRetrieveResponseDto retrieval
    ) {
        ChatPromptPlan prompt = preparePrompt(queryPlan, mentions, retrieval);
        long startedAt = System.currentTimeMillis();
        ChatResponse response = request(chatId, prompt)
                .call()
                .chatResponse();

        if (response == null || response.getResult() == null) {
            throw new IllegalStateException("LLM returned an empty response");
        }

        var metadata = response.getMetadata();
        var usage = metadata == null ? null : metadata.getUsage();
        return new ChatGenerationResult(
                response.getResult().getOutput().getText(),
                metadata == null || metadata.getModel() == null ? configuredModel : metadata.getModel(),
                usage == null ? null : usage.getPromptTokens(),
                usage == null ? null : usage.getCompletionTokens(),
                System.currentTimeMillis() - startedAt,
                prompt.evidence()
        );
    }

    public Flux<ChatResponse> stream(
            String chatId,
            ChatPromptPlan prompt
    ) {
        return request(chatId, prompt)
                .stream()
                .chatResponse();
    }

    public String configuredModel() {
        return configuredModel;
    }

    public ChatPromptPlan preparePrompt(
            QueryPlan queryPlan,
            List<EntityMentionDto> mentions,
            GraphRagRetrieveResponseDto retrieval
    ) {
        String context = formatContexts(retrieval);
        String entities = formatEntities(retrieval);
        String graphPaths = formatGraphPaths(retrieval);
        String knowledgeInstructions = "available".equals(retrieval.retrievalStatus())
                ? """
                  Внутренняя база знаний доступна.
                  Для исследовательских утверждений используй только приведенные фрагменты и связи.
                  Если данных недостаточно или они противоречат друг другу, скажи об этом прямо.
                  Указывай название документа и страницу рядом с подтверждаемым выводом.
                  """
                : """
                  Внутренняя база знаний сейчас недоступна.
                  На обычные разговорные сообщения отвечай естественно.
                  Для исследовательских вопросов честно сообщай, что не можешь подтвердить ответ внутренними источниками.
                  """;

        String systemPrompt = """
                Ты исследовательский ассистент для материаловедения.
                Отвечай на языке пользователя, ясно и без выдуманных фактов или источников.

                %s

                Подсказка retrieval:
                %s

                Контекст внутренней базы:
                %s

                Связанные сущности:
                %s

                Найденные пути графа:
                %s
                """.formatted(
                knowledgeInstructions,
                retrieval.answerHint(),
                context,
                entities,
                graphPaths
        );
        String userPrompt = removeMentionMarkers(queryPlan.originalQuery(), mentions);
        ChatEvidenceDto evidence = new ChatEvidenceDto(
                queryPlan.originalQuery(),
                queryPlan.retrievalQuery(),
                queryPlan.transformation().name().toLowerCase(Locale.ROOT)
                        + (queryPlan.rejectionReason() == null ? "" : "_rejected"),
                queryPlan.graphDepth(),
                systemPrompt,
                userPrompt,
                retrieval.contexts() == null ? List.of() : retrieval.contexts(),
                retrieval.matchedEntities() == null ? List.of() : retrieval.matchedEntities(),
                retrieval.graphPaths() == null ? List.of() : retrieval.graphPaths()
        );
        return new ChatPromptPlan(systemPrompt, userPrompt, evidence);
    }

    private ChatClient.ChatClientRequestSpec request(
            String chatId,
            ChatPromptPlan prompt
    ) {
        ChatClient.Builder builder = chatClientBuilderProvider.getIfAvailable();
        if (builder == null) {
            throw new IllegalStateException("Spring AI ChatClient is not configured");
        }

        return builder.build()
                .prompt()
                .system(prompt.systemPrompt())
                .user(prompt.userPrompt())
                .advisors(spec -> spec
                        .advisors(chatMemoryAdvisor)
                        .param(ChatMemory.CONVERSATION_ID, chatId));
    }

    private String formatContexts(GraphRagRetrieveResponseDto retrieval) {
        List<GraphRagContextDto> contexts = retrieval.contexts() == null
                ? List.of()
                : retrieval.contexts();
        if (!contexts.isEmpty()) {
            return contexts.stream()
                    .map(context -> """
                            [Документ: %s; страница: %s; раздел: %s; релевантность: %s]
                            %s
                            """.formatted(
                            valueOrFallback(context.documentTitle(), context.documentId()),
                            context.page() == null ? "не указана" : context.page(),
                            valueOrFallback(context.section(), "не указан"),
                            context.score() == null
                                    ? "не указана"
                                    : String.format(Locale.ROOT, "%.3f", context.score()),
                            valueOrFallback(context.text(), "")
                    ).trim())
                    .collect(Collectors.joining("\n\n"));
        }

        List<String> chunks = retrieval.contextChunks() == null
                ? List.of()
                : retrieval.contextChunks();
        return chunks.isEmpty()
                ? "Релевантные фрагменты не найдены."
                : String.join("\n\n", chunks);
    }

    private String formatEntities(GraphRagRetrieveResponseDto retrieval) {
        List<GraphRagMatchedEntityDto> entities = retrieval.matchedEntities() == null
                ? List.of()
                : retrieval.matchedEntities();
        if (entities.isEmpty()) {
            return "Связанные сущности не найдены.";
        }
        return entities.stream()
                .map(entity -> "- %s [%s]: %s".formatted(
                        entity.label(),
                        entity.type() == null ? "unclassified" : entity.type().getValue(),
                        valueOrFallback(entity.description(), "описание отсутствует")
                ))
                .collect(Collectors.joining("\n"));
    }

    private String formatGraphPaths(GraphRagRetrieveResponseDto retrieval) {
        List<GraphRagPathDto> paths = retrieval.graphPaths() == null
                ? List.of()
                : retrieval.graphPaths();
        if (paths.isEmpty()) {
            return "Связи графа не найдены.";
        }
        return paths.stream()
                .map(path -> "- %s [%s] --%s--> %s [%s]".formatted(
                        valueOrFallback(path.sourceLabel(), path.sourceId()),
                        path.sourceType() == null
                                ? "unclassified"
                                : path.sourceType().getValue(),
                        humanizeRelationship(path.relationship()),
                        valueOrFallback(path.targetLabel(), path.targetId()),
                        path.targetType() == null
                                ? "unclassified"
                                : path.targetType().getValue()
                ))
                .collect(Collectors.joining("\n"));
    }

    private String humanizeRelationship(String relationship) {
        if (relationship == null) {
            return "связан с";
        }
        return switch (relationship) {
            case "USES_MATERIAL" -> "использует материал";
            case "USES_REGIME" -> "использует режим";
            case "AFFECTS" -> "влияет на";
            case "MEASURES" -> "измеряет";
            case "USES_EQUIPMENT" -> "использует оборудование";
            case "PERFORMED_BY" -> "выполнен командой";
            case "PRODUCES_CONCLUSION" -> "формирует вывод";
            case "BASED_ON" -> "основан на";
            case "RELATED_TO" -> "связан с";
            case "COMPARED_WITH" -> "сравнивается с";
            case "USES" -> "использует";
            case "SELECTED" -> "выбран как якорь";
            default -> relationship;
        };
    }

    private String valueOrFallback(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private String removeMentionMarkers(
            String userQuery,
            List<EntityMentionDto> mentions
    ) {
        String normalized = userQuery;
        for (EntityMentionDto mention : mentions == null ? List.<EntityMentionDto>of() : mentions) {
            normalized = normalized.replace("@" + mention.label(), mention.label());
        }
        return normalized;
    }
}
