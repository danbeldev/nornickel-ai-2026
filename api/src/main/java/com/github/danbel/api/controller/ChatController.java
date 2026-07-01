package com.github.danbel.api.controller;

import com.github.danbel.api.dto.chat.AskAssistantRequestDto;
import com.github.danbel.api.dto.chat.AskAssistantResponseDto;
import com.github.danbel.api.dto.chat.ChatSummaryDto;
import com.github.danbel.api.dto.chat.CreateChatRequestDto;
import com.github.danbel.api.dto.chat.ResearchChatDto;
import com.github.danbel.api.service.ChatService;
import com.github.danbel.api.service.ChatStreamService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/chats")
public class ChatController {

    private final ChatService chatService;
    private final ChatStreamService chatStreamService;

    @GetMapping
    public List<ChatSummaryDto> getChats() {
        return chatService.getChats();
    }

    @GetMapping("/recent")
    public List<ChatSummaryDto> getRecentChats(@RequestParam(defaultValue = "5") int limit) {
        return chatService.getRecentChats(limit);
    }

    @PostMapping
    public ResearchChatDto createChat(@Valid @RequestBody CreateChatRequestDto request) {
        return chatService.createChat(request);
    }

    @GetMapping("/{chatId}")
    public ResearchChatDto getChat(@PathVariable String chatId) {
        return chatService.getChat(chatId);
    }

    @PostMapping("/{chatId}/messages")
    public AskAssistantResponseDto askAssistant(
            @PathVariable String chatId,
            @Valid @RequestBody AskAssistantRequestDto request
    ) {
        return chatService.askAssistant(chatId, request);
    }

    @PostMapping(path = "/{chatId}/messages/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public ResponseEntity<SseEmitter> streamAssistantResponse(
            @PathVariable String chatId,
            @Valid @RequestBody AskAssistantRequestDto request
    ) {
        return ResponseEntity.ok()
                .header("Cache-Control", "no-cache")
                .header("X-Accel-Buffering", "no")
                .body(chatStreamService.streamAssistantResponse(chatId, request));
    }
}
