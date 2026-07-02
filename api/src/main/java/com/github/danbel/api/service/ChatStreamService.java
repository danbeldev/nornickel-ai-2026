package com.github.danbel.api.service;

import com.github.danbel.api.dto.chat.AskAssistantRequestDto;
import com.github.danbel.api.dto.chat.ChatCitationDto;
import com.github.danbel.api.dto.chat.ChatStreamEventDto;
import com.github.danbel.api.dto.chat.EntityMentionDto;
import com.github.danbel.api.model.enums.ChatMessageStatus;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.Executor;
import java.util.concurrent.atomic.AtomicReference;

@Service
public class ChatStreamService {

    private final ChatService chatService;
    private final ChatGenerationService chatGenerationService;
    private final GraphRagGateway graphRagGateway;
    private final Executor executor;

    public ChatStreamService(
            ChatService chatService,
            ChatGenerationService chatGenerationService,
            GraphRagGateway graphRagGateway,
            @Qualifier("chatStreamExecutor") Executor executor
    ) {
        this.chatService = chatService;
        this.chatGenerationService = chatGenerationService;
        this.graphRagGateway = graphRagGateway;
        this.executor = executor;
    }

    public SseEmitter streamAssistantResponse(String chatId, AskAssistantRequestDto request) {
        SseEmitter emitter = new SseEmitter(300_000L);
        executor.execute(() -> {
            long startedAt = System.currentTimeMillis();
            StringBuilder answer = new StringBuilder();
            String[] messageId = {null};
            try {
                var prepared = chatService.prepareAssistantTurn(chatId, request);
                messageId[0] = prepared.assistantMessage().id();
                if (prepared.existing() && prepared.assistantMessage().status() == ChatMessageStatus.COMPLETED) {
                    send(emitter, "message_completed", new ChatStreamEventDto(
                            "message_completed",
                            messageId[0],
                            null,
                            prepared.assistantMessage(),
                            null,
                            prepared.assistantMessage().evidence(),
                            null
                    ));
                    emitter.complete();
                    return;
                }

                send(emitter, "message_started", new ChatStreamEventDto(
                        "message_started",
                        messageId[0],
                        null,
                        prepared.assistantMessage(),
                        null,
                        null,
                        null
                ));
                send(emitter, "retrieval_started", new ChatStreamEventDto(
                        "retrieval_started",
                        messageId[0],
                        null,
                        null,
                        null,
                        null,
                        null
                ));
                List<EntityMentionDto> mentions =
                        request.mentions() == null ? List.of() : request.mentions();
                var retrieval = graphRagGateway.retrieve(
                        request.text(),
                        mentions
                );
                List<ChatCitationDto> citations = retrieval.citations() == null ? List.of() : retrieval.citations();
                ChatPromptPlan prompt = chatGenerationService.preparePrompt(
                        request.text(),
                        mentions,
                        retrieval
                );
                chatService.saveAssistantEvidence(messageId[0], prompt.evidence());
                send(emitter, "retrieval_completed", new ChatStreamEventDto(
                        "retrieval_completed",
                        messageId[0],
                        null,
                        null,
                        null,
                        prompt.evidence(),
                        null
                ));
                send(emitter, "citations", new ChatStreamEventDto(
                        "citations",
                        messageId[0],
                        null,
                        null,
                        citations,
                        null,
                        null
                ));
                send(emitter, "generation_started", new ChatStreamEventDto(
                        "generation_started",
                        messageId[0],
                        null,
                        null,
                        null,
                        prompt.evidence(),
                        null
                ));

                AtomicReference<String> model = new AtomicReference<>(chatGenerationService.configuredModel());
                AtomicReference<Integer> promptTokens = new AtomicReference<>();
                AtomicReference<Integer> completionTokens = new AtomicReference<>();

                chatGenerationService.stream(chatId, prompt)
                        .doOnNext(response -> {
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
                            try {
                                send(emitter, "content_delta", new ChatStreamEventDto(
                                        "content_delta",
                                        messageId[0],
                                        delta,
                                        null,
                                        null,
                                        null,
                                        null
                                ));
                            } catch (IOException exception) {
                                throw new IllegalStateException(exception);
                            }
                        })
                        .blockLast();

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
                send(emitter, "message_completed", new ChatStreamEventDto(
                        "message_completed",
                        message.id(),
                        null,
                        message,
                        null,
                        message.evidence(),
                        null
                ));
                emitter.complete();
            } catch (Exception exception) {
                boolean interrupted = causedByIOException(exception);
                if (messageId[0] != null) {
                    chatService.failAssistantMessage(
                            messageId[0],
                            answer.toString(),
                            interrupted
                                    ? "Соединение с клиентом было закрыто"
                                    : "Не удалось получить ответ от языковой модели",
                            interrupted,
                            System.currentTimeMillis() - startedAt
                    );
                }
                try {
                    send(emitter, "error", new ChatStreamEventDto(
                            "error",
                            messageId[0],
                            null,
                            null,
                            null,
                            null,
                            interrupted
                                    ? "Генерация была прервана"
                                    : "Языковая модель временно недоступна"
                    ));
                } catch (IOException ignored) {
                    // The client can disconnect while the answer is streaming.
                }
                emitter.complete();
            }
        });
        return emitter;
    }

    private void send(SseEmitter emitter, String eventName, ChatStreamEventDto event) throws IOException {
        emitter.send(SseEmitter.event().name(eventName).data(event));
    }

    private boolean causedByIOException(Throwable error) {
        Throwable current = error;
        while (current != null) {
            if (current instanceof IOException) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }
}
