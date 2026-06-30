package com.github.danbel.api.service;

import com.github.danbel.api.dto.chat.AskAssistantRequestDto;
import com.github.danbel.api.dto.chat.ChatStreamEventDto;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executor;

@Service
public class ChatStreamService {

    private final ChatService chatService;
    private final ChatGenerationService chatGenerationService;
    private final Executor executor;

    public ChatStreamService(
            ChatService chatService,
            ChatGenerationService chatGenerationService,
            @Qualifier("chatStreamExecutor") Executor executor
    ) {
        this.chatService = chatService;
        this.chatGenerationService = chatGenerationService;
        this.executor = executor;
    }

    public SseEmitter streamAssistantResponse(String chatId, AskAssistantRequestDto request) {
        SseEmitter emitter = new SseEmitter(0L);
        executor.execute(() -> {
            try {
                send(emitter, "message_started", new ChatStreamEventDto("message_started", null, null, null, null, null));
                send(emitter, "retrieval_started", new ChatStreamEventDto("retrieval_started", null, null, null, null, null));
                var retrieval = chatService.startAssistantStream(chatId, request);
                var citations = retrieval.citations() == null ? List.of() : retrieval.citations();
                String provisionalMessageId = "streaming";
                StringBuilder answer = new StringBuilder();
                CountDownLatch latch = new CountDownLatch(1);
                send(emitter, "citations", new ChatStreamEventDto("citations", provisionalMessageId, null, null, citations, null));

                chatGenerationService.stream(request.text(), retrieval)
                        .doOnNext(delta -> {
                            answer.append(delta);
                            try {
                                send(emitter, "content_delta", new ChatStreamEventDto("content_delta", provisionalMessageId, delta, null, null, null));
                            } catch (IOException exception) {
                                throw new IllegalStateException(exception);
                            }
                        })
                        .doOnError(error -> latch.countDown())
                        .doOnComplete(latch::countDown)
                        .subscribe();
                latch.await();

                var message = chatService.saveStreamedAssistantMessage(chatId, answer.toString(), citations);
                send(emitter, "message_completed", new ChatStreamEventDto("message_completed", message.id(), null, message, null, null));
                emitter.complete();
            } catch (Exception exception) {
                try {
                    send(emitter, "error", new ChatStreamEventDto("error", null, null, null, null, exception.getMessage()));
                } catch (IOException ignored) {
                    // The client can disconnect while the answer is streaming.
                }
                emitter.completeWithError(exception);
            }
        });
        return emitter;
    }

    private void send(SseEmitter emitter, String eventName, ChatStreamEventDto event) throws IOException {
        emitter.send(SseEmitter.event().name(eventName).data(event));
    }
}
