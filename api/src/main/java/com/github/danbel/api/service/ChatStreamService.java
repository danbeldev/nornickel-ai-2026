package com.github.danbel.api.service;

import com.github.danbel.api.dto.chat.AskAssistantRequestDto;
import com.github.danbel.api.dto.chat.ChatCitationDto;
import com.github.danbel.api.dto.chat.ChatStreamEventDto;
import com.github.danbel.api.dto.chat.EntityMentionDto;
import com.github.danbel.api.model.enums.ChatMessageStatus;
import com.github.danbel.api.model.enums.ChatProcessingStage;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executor;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

@Service
public class ChatStreamService {

    private static final long SSE_TIMEOUT_MILLIS = 30 * 60 * 1_000L;

    private final ChatService chatService;
    private final ChatGenerationService chatGenerationService;
    private final GraphRagGateway graphRagGateway;
    private final QueryTransformationService queryTransformationService;
    private final Executor executor;
    private final ConcurrentHashMap<String, AtomicBoolean> cancellations =
            new ConcurrentHashMap<>();

    public ChatStreamService(
            ChatService chatService,
            ChatGenerationService chatGenerationService,
            GraphRagGateway graphRagGateway,
            QueryTransformationService queryTransformationService,
            @Qualifier("chatStreamExecutor") Executor executor
    ) {
        this.chatService = chatService;
        this.chatGenerationService = chatGenerationService;
        this.graphRagGateway = graphRagGateway;
        this.queryTransformationService = queryTransformationService;
        this.executor = executor;
    }

    public SseEmitter streamAssistantResponse(String chatId, AskAssistantRequestDto request) {
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MILLIS);
        AtomicBoolean clientConnected = new AtomicBoolean(true);
        AtomicBoolean canceled = new AtomicBoolean(false);
        String cancellationKey = cancellationKey(chatId, request.requestId());
        cancellations.put(cancellationKey, canceled);
        emitter.onCompletion(() -> clientConnected.set(false));
        emitter.onTimeout(() -> clientConnected.set(false));
        emitter.onError(error -> clientConnected.set(false));
        executor.execute(() -> {
            long startedAt = System.currentTimeMillis();
            StringBuilder answer = new StringBuilder();
            String[] messageId = {null};
            try {
                var prepared = chatService.prepareAssistantTurn(chatId, request);
                messageId[0] = prepared.assistantMessage().id();
                if (prepared.existing() && prepared.assistantMessage().status() == ChatMessageStatus.COMPLETED) {
                    sendIfConnected(emitter, clientConnected, "message_completed", new ChatStreamEventDto(
                            "message_completed",
                            messageId[0],
                            null,
                            prepared.assistantMessage(),
                            null,
                            prepared.assistantMessage().evidence(),
                            null,
                            null
                    ));
                    completeIfConnected(emitter, clientConnected);
                    return;
                }

                sendIfConnected(emitter, clientConnected, "message_started", new ChatStreamEventDto(
                        "message_started",
                        messageId[0],
                        null,
                        prepared.assistantMessage(),
                        null,
                        null,
                        null,
                        null
                ));
                List<EntityMentionDto> mentions =
                        request.mentions() == null ? List.of() : request.mentions();
                ensureNotCanceled(canceled);
                QueryPlan queryPlan = queryTransformationService.plan(
                        chatId,
                        request.text(),
                        mentions,
                        event -> persistAndSendStatus(
                                emitter,
                                clientConnected,
                                messageId[0],
                                event.stage(),
                                event.message()
                        )
                );
                persistAndSendStatus(
                        emitter,
                        clientConnected,
                        messageId[0],
                        ChatProcessingStage.RETRIEVING_KNOWLEDGE,
                        "Поиск с глубиной графа " + queryPlan.graphDepth() + "."
                );
                ensureNotCanceled(canceled);
                var retrieval = graphRagGateway.retrieve(
                        queryPlan.retrievalQuery(),
                        mentions,
                        queryPlan.graphDepth(),
                        queryPlan.filters()
                );
                ensureNotCanceled(canceled);
                List<ChatCitationDto> citations = retrieval.citations() == null ? List.of() : retrieval.citations();
                ChatPromptPlan prompt = chatGenerationService.preparePrompt(
                        queryPlan,
                        mentions,
                        retrieval
                );
                chatService.saveAssistantEvidence(messageId[0], prompt.evidence());
                chatService.saveAssistantProgress(messageId[0], "", citations);
                persistAndSendStatus(
                        emitter,
                        clientConnected,
                        messageId[0],
                        ChatProcessingStage.KNOWLEDGE_RETRIEVED,
                        retrievalSummary(retrieval)
                );
                sendIfConnected(emitter, clientConnected, "retrieval_completed", new ChatStreamEventDto(
                        "retrieval_completed",
                        messageId[0],
                        null,
                        null,
                        null,
                        prompt.evidence(),
                        null,
                        null
                ));
                sendIfConnected(emitter, clientConnected, "citations", new ChatStreamEventDto(
                        "citations",
                        messageId[0],
                        null,
                        null,
                        citations,
                        null,
                        null,
                        null
                ));
                persistAndSendStatus(
                        emitter,
                        clientConnected,
                        messageId[0],
                        ChatProcessingStage.GENERATING_RESPONSE,
                        null
                );
                sendIfConnected(emitter, clientConnected, "generation_started", new ChatStreamEventDto(
                        "generation_started",
                        messageId[0],
                        null,
                        null,
                        null,
                        prompt.evidence(),
                        null,
                        null
                ));

                AtomicReference<String> model = new AtomicReference<>(chatGenerationService.configuredModel());
                AtomicReference<Integer> promptTokens = new AtomicReference<>();
                AtomicReference<Integer> completionTokens = new AtomicReference<>();
                long[] lastProgressPersistedAt = {0L};

                ensureNotCanceled(canceled);
                chatGenerationService.stream(chatId, prompt)
                        .doOnNext(response -> {
                            ensureNotCanceled(canceled);
                            if (response.getMetadata() != null) {
                                if (response.getMetadata().getModel() != null) {
                                    model.set(response.getMetadata().getModel());
                                }
                                if (response.getMetadata().getUsage() != null) {
                                    if (response.getMetadata().getUsage().getPromptTokens() != null) {
                                        promptTokens.set(response.getMetadata().getUsage().getPromptTokens());
                                    }
                                    if (response.getMetadata().getUsage().getCompletionTokens() != null) {
                                        completionTokens.set(response.getMetadata().getUsage().getCompletionTokens());
                                    }
                                }
                            }
                            String delta = response.getResult() == null
                                    ? null
                                    : response.getResult().getOutput().getText();
                            if (delta == null || delta.isEmpty()) {
                                return;
                            }
                            answer.append(delta);
                            long now = System.currentTimeMillis();
                            if (now - lastProgressPersistedAt[0] >= 1_000L) {
                                chatService.saveAssistantProgress(
                                        messageId[0],
                                        answer.toString(),
                                        citations
                                );
                                lastProgressPersistedAt[0] = now;
                            }
                            sendIfConnected(emitter, clientConnected, "content_delta", new ChatStreamEventDto(
                                    "content_delta",
                                    messageId[0],
                                    delta,
                                    null,
                                    null,
                                    null,
                                    null,
                                    null
                            ));
                        })
                        .blockLast();

                ensureNotCanceled(canceled);
                if (answer.isEmpty()) {
                    throw new IllegalStateException("LLM returned an empty response");
                }

                var message = chatService.completeAssistantMessage(
                        messageId[0],
                        answer.toString(),
                        citations,
                        model.get(),
                        promptTokens.get(),
                        completionTokens.get(),
                        System.currentTimeMillis() - startedAt,
                        prompt.evidence()
                );
                sendIfConnected(emitter, clientConnected, "message_completed", new ChatStreamEventDto(
                        "message_completed",
                        message.id(),
                        null,
                        message,
                        null,
                        message.evidence(),
                        null,
                        null
                ));
                completeIfConnected(emitter, clientConnected);
            } catch (Exception exception) {
                boolean interrupted = exception instanceof ChatGenerationCanceledException;
                String persistedError = interrupted
                        ? "Генерация остановлена пользователем"
                        : "Не удалось получить ответ от языковой модели";
                if (messageId[0] != null) {
                    var failedMessage = chatService.failAssistantMessage(
                            messageId[0],
                            answer.toString(),
                            persistedError,
                            interrupted,
                            System.currentTimeMillis() - startedAt
                    );
                    var statusHistory = failedMessage.statusHistory();
                    if (statusHistory != null && !statusHistory.isEmpty()) {
                        var statusEvent = statusHistory.get(statusHistory.size() - 1);
                        sendIfConnected(emitter, clientConnected, "status_changed", new ChatStreamEventDto(
                                "status_changed",
                                messageId[0],
                                null,
                                null,
                                null,
                                null,
                                statusEvent,
                                null
                        ));
                    }
                }
                sendIfConnected(emitter, clientConnected, "error", new ChatStreamEventDto(
                        "error",
                        messageId[0],
                        null,
                        null,
                        null,
                        null,
                        null,
                        interrupted
                                ? "Генерация была прервана"
                                : "Языковая модель временно недоступна"
                ));
                completeIfConnected(emitter, clientConnected);
            } finally {
                cancellations.remove(cancellationKey, canceled);
            }
        });
        return emitter;
    }

    public boolean cancel(String chatId, String requestId) {
        AtomicBoolean cancellation = cancellations.get(
                cancellationKey(chatId, requestId)
        );
        return cancellation != null && cancellation.compareAndSet(false, true);
    }

    private String cancellationKey(String chatId, String requestId) {
        return chatId + ":" + requestId;
    }

    private void persistAndSendStatus(
            SseEmitter emitter,
            AtomicBoolean clientConnected,
            String messageId,
            ChatProcessingStage stage,
            String message
    ) {
        var statusEvent = chatService.appendStatus(messageId, stage, message);
        sendIfConnected(emitter, clientConnected, "status_changed", new ChatStreamEventDto(
                "status_changed",
                messageId,
                null,
                null,
                null,
                null,
                statusEvent,
                null
        ));
    }

    private void sendIfConnected(
            SseEmitter emitter,
            AtomicBoolean clientConnected,
            String eventName,
            ChatStreamEventDto event
    ) {
        if (!clientConnected.get()) {
            return;
        }
        try {
            emitter.send(SseEmitter.event().name(eventName).data(event));
        } catch (IOException | IllegalStateException exception) {
            clientConnected.set(false);
        }
    }

    private void completeIfConnected(
            SseEmitter emitter,
            AtomicBoolean clientConnected
    ) {
        if (clientConnected.compareAndSet(true, false)) {
            emitter.complete();
        }
    }

    private void ensureNotCanceled(AtomicBoolean canceled) {
        if (canceled.get()) {
            throw new ChatGenerationCanceledException();
        }
    }

    private String retrievalSummary(
            com.github.danbel.api.client.dto.GraphRagRetrieveResponseDto retrieval
    ) {
        if (!"available".equals(retrieval.retrievalStatus())) {
            return retrieval.answerHint();
        }
        return "Найдено: %d фрагментов, %d сущностей, %d связей."
                .formatted(
                        retrieval.contexts() == null ? 0 : retrieval.contexts().size(),
                        retrieval.matchedEntities() == null ? 0 : retrieval.matchedEntities().size(),
                        retrieval.graphPaths() == null ? 0 : retrieval.graphPaths().size()
                );
    }

    private static final class ChatGenerationCanceledException
            extends RuntimeException {
    }
}
