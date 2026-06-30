package com.github.danbel.api.service;

import com.github.danbel.api.dto.chat.AskAssistantRequestDto;
import com.github.danbel.api.dto.chat.AskAssistantResponseDto;
import com.github.danbel.api.dto.chat.ChatCitationDto;
import com.github.danbel.api.dto.chat.ChatMessageDto;
import com.github.danbel.api.dto.chat.ChatSummaryDto;
import com.github.danbel.api.dto.chat.EntityMentionDto;
import com.github.danbel.api.dto.chat.ResearchChatDto;
import com.github.danbel.api.exception.ResourceNotFoundException;
import com.github.danbel.api.mapper.ApiDtoMapper;
import com.github.danbel.api.mapper.JsonPayloadMapper;
import com.github.danbel.api.model.entity.ChatEntity;
import com.github.danbel.api.model.entity.ChatMessageEntity;
import com.github.danbel.api.model.enums.ChatHistoryGroup;
import com.github.danbel.api.model.enums.ChatMessageRole;
import com.github.danbel.api.repository.ChatRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatRepository chatRepository;
    private final GraphRagGateway graphRagGateway;
    private final ChatGenerationService chatGenerationService;
    private final JsonPayloadMapper json;
    private final ApiDtoMapper mapper;

    public List<ChatSummaryDto> getChats() {
        return chatRepository.findAllByOrderByUpdatedAtDesc().stream()
                .map(mapper::toChatSummary)
                .toList();
    }

    public List<ChatSummaryDto> getRecentChats(int limit) {
        return chatRepository.findAllByOrderByUpdatedAtDesc().stream()
                .limit(limit)
                .map(mapper::toChatSummary)
                .toList();
    }

    @Transactional(readOnly = true)
    public ResearchChatDto getChat(String chatId) {
        return chatRepository.findById(chatId)
                .map(mapper::toResearchChat)
                .orElseThrow(() -> new ResourceNotFoundException("Chat not found: " + chatId));
    }

    @Transactional
    public ResearchChatDto createChat(AskAssistantRequestDto request) {
        OffsetDateTime now = OffsetDateTime.now();
        ChatEntity chat = ChatEntity.builder()
                .id("chat-" + UUID.randomUUID())
                .title(createTitle(request.text()))
                .group(resolveGroup(now))
                .createdAt(now)
                .updatedAt(now)
                .build();

        chatRepository.save(chat);
        askAssistant(chat.getId(), request);
        return getChat(chat.getId());
    }

    @Transactional
    public AskAssistantResponseDto askAssistant(String chatId, AskAssistantRequestDto request) {
        ChatEntity chat = chatRepository.findById(chatId)
                .orElseThrow(() -> new ResourceNotFoundException("Chat not found: " + chatId));
        List<EntityMentionDto> mentions = request.mentions() == null ? List.of() : request.mentions();
        OffsetDateTime now = OffsetDateTime.now();

        chat.addMessage(ChatMessageEntity.builder()
                .id("msg-user-" + UUID.randomUUID())
                .role(ChatMessageRole.USER)
                .text(request.text())
                .mentionsJson(json.write(mentions))
                .citationsJson(json.write(List.of()))
                .createdAt(now)
                .build());

        var retrieval = graphRagGateway.retrieve(request.text(), mentions);
        String answer = chatGenerationService.generate(request.text(), retrieval);
        List<ChatCitationDto> citations = retrieval.citations() == null ? List.of() : retrieval.citations();
        ChatMessageEntity assistantMessage = ChatMessageEntity.builder()
                .id("msg-assistant-" + UUID.randomUUID())
                .role(ChatMessageRole.ASSISTANT)
                .text(answer)
                .mentionsJson(json.write(List.of()))
                .citationsJson(json.write(citations))
                .createdAt(OffsetDateTime.now())
                .build();
        chat.addMessage(assistantMessage);
        chatRepository.save(chat);

        return new AskAssistantResponseDto(
                mapper.toChatMessage(assistantMessage),
                retrieval.sourcesFound(),
                retrieval.experimentsFound()
        );
    }

    private String createTitle(String text) {
        String trimmed = text.strip();
        if (trimmed.length() <= 58) {
            return trimmed;
        }
        return trimmed.substring(0, 58) + "...";
    }

    private ChatHistoryGroup resolveGroup(OffsetDateTime dateTime) {
        LocalDate date = dateTime.atZoneSameInstant(ZoneId.systemDefault()).toLocalDate();
        LocalDate today = LocalDate.now();
        if (date.equals(today)) {
            return ChatHistoryGroup.TODAY;
        }
        if (date.equals(today.minusDays(1))) {
            return ChatHistoryGroup.YESTERDAY;
        }
        return ChatHistoryGroup.EARLIER;
    }
}
