package com.github.danbel.api.service;

import com.github.danbel.api.dto.chat.AskAssistantRequestDto;
import com.github.danbel.api.dto.chat.AskAssistantResponseDto;
import com.github.danbel.api.dto.chat.ChatStreamEventDto;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.concurrent.Executor;

@Service
public class ChatStreamService {

    private final ChatService chatService;
    private final Executor executor;

    public ChatStreamService(ChatService chatService, @Qualifier("chatStreamExecutor") Executor executor) {
        this.chatService = chatService;
        this.executor = executor;
    }

    public SseEmitter streamAssistantResponse(String chatId, AskAssistantRequestDto request) {
        SseEmitter emitter = new SseEmitter(0L);
        executor.execute(() -> {
            try {
                send(emitter, "message_started", new ChatStreamEventDto("message_started", null, null, null, null, null));
                send(emitter, "retrieval_started", new ChatStreamEventDto("retrieval_started", null, null, null, null, null));
                AskAssistantResponseDto response = chatService.askAssistant(chatId, request);
                String messageId = response.message().id();
                send(emitter, "citations", new ChatStreamEventDto("citations", messageId, null, null, response.message().citations(), null));

                for (String token : response.message().text().split(" ")) {
                    send(emitter, "content_delta", new ChatStreamEventDto("content_delta", messageId, token + " ", null, null, null));
                }

                send(emitter, "message_completed", new ChatStreamEventDto("message_completed", messageId, null, response.message(), null, null));
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
