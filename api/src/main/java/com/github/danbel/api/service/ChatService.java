package com.github.danbel.api.service;

import com.github.danbel.api.dto.chat.AskAssistantRequestDto;
import com.github.danbel.api.dto.chat.AskAssistantResponseDto;
import com.github.danbel.api.dto.chat.ChatCitationDto;
import com.github.danbel.api.dto.chat.ChatEvidenceDto;
import com.github.danbel.api.dto.chat.ChatMessageDto;
import com.github.danbel.api.dto.chat.ChatSummaryDto;
import com.github.danbel.api.dto.chat.CreateChatRequestDto;
import com.github.danbel.api.dto.chat.EntityMentionDto;
import com.github.danbel.api.dto.chat.ResearchChatDto;
import com.github.danbel.api.exception.ResourceNotFoundException;
import com.github.danbel.api.mapper.ApiDtoMapper;
import com.github.danbel.api.mapper.JsonPayloadMapper;
import com.github.danbel.api.model.entity.ChatEntity;
import com.github.danbel.api.model.entity.ChatMessageEntity;
import com.github.danbel.api.model.enums.ChatHistoryGroup;
import com.github.danbel.api.model.enums.ChatMessageRole;
import com.github.danbel.api.model.enums.ChatMessageStatus;
import com.github.danbel.api.repository.ChatMessageRepository;
import com.github.danbel.api.repository.ChatRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatRepository chatRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ChatMemory chatMemory;
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
    public ResearchChatDto createChat(CreateChatRequestDto request) {
        OffsetDateTime now = OffsetDateTime.now();
        ChatEntity chat = ChatEntity.builder()
                .id("chat-" + UUID.randomUUID())
                .title(createTitle(request.text()))
                .group(resolveGroup(now))
                .createdAt(now)
                .updatedAt(now)
                .build();

        chatRepository.save(chat);
        return getChat(chat.getId());
    }

    @Transactional
    public AskAssistantResponseDto askAssistant(String chatId, AskAssistantRequestDto request) {
        PreparedChatTurn prepared = prepareAssistantTurn(chatId, request);
        if (prepared.existing() && prepared.assistantMessage().status() == ChatMessageStatus.COMPLETED) {
            List<ChatCitationDto> citations = prepared.assistantMessage().citations();
            return new AskAssistantResponseDto(
                    prepared.assistantMessage(),
                    citations.size(),
                    (int) citations.stream()
                            .filter(citation -> citation.entityType() == com.github.danbel.api.model.enums.MentionableEntityType.EXPERIMENT)
                            .count()
            );
        }

        List<EntityMentionDto> mentions = safeMentions(request);
        var retrieval = graphRagGateway.retrieve(request.text(), mentions);
        ChatGenerationResult generation = chatGenerationService.generate(
                chatId,
                request.text(),
                mentions,
                retrieval
        );
        List<ChatCitationDto> citations = retrieval.citations() == null ? List.of() : retrieval.citations();
        ChatMessageDto assistantMessage = completeAssistantMessage(
                prepared.assistantMessage().id(),
                generation.text(),
                citations,
                generation.model(),
                generation.promptTokens(),
                generation.completionTokens(),
                generation.durationMs(),
                generation.evidence()
        );

        return new AskAssistantResponseDto(
                assistantMessage,
                retrieval.sourcesFound(),
                retrieval.experimentsFound()
        );
    }

    @Transactional
    public PreparedChatTurn prepareAssistantTurn(String chatId, AskAssistantRequestDto request) {
        var existingAssistant = chatMessageRepository.findByChat_IdAndRequestIdAndRole(
                chatId,
                request.requestId(),
                ChatMessageRole.ASSISTANT
        );
        if (existingAssistant.isPresent()) {
            return new PreparedChatTurn(mapper.toChatMessage(existingAssistant.get()), true);
        }

        ChatEntity chat = chatRepository.findById(chatId)
                .orElseThrow(() -> new ResourceNotFoundException("Chat not found: " + chatId));
        initializeModelMemory(chat);
        OffsetDateTime now = OffsetDateTime.now();
        appendUserMessage(chat, request, now);
        ChatMessageEntity assistantMessage = ChatMessageEntity.builder()
                .id("msg-assistant-" + UUID.randomUUID())
                .role(ChatMessageRole.ASSISTANT)
                .text("")
                .mentionsJson(json.write(List.of()))
                .citationsJson(json.write(List.of()))
                .evidenceJson(null)
                .status(ChatMessageStatus.STREAMING)
                .requestId(request.requestId())
                .createdAt(now)
                .updatedAt(now)
                .build();
        chat.addMessage(assistantMessage);
        chatRepository.save(chat);
        return new PreparedChatTurn(mapper.toChatMessage(assistantMessage), false);
    }

    @Transactional
    public ChatMessageDto completeAssistantMessage(
            String messageId,
            String text,
            List<ChatCitationDto> citations,
            String model,
            Integer promptTokens,
            Integer completionTokens,
            long durationMs,
            ChatEvidenceDto evidence
    ) {
        ChatMessageEntity message = chatMessageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Chat message not found: " + messageId));
        OffsetDateTime now = OffsetDateTime.now();
        message.setText(text);
        message.setCitationsJson(json.write(citations == null ? List.of() : citations));
        message.setStatus(ChatMessageStatus.COMPLETED);
        message.setModel(model);
        message.setPromptTokens(promptTokens);
        message.setCompletionTokens(completionTokens);
        message.setGenerationDurationMs(durationMs);
        if (evidence != null) {
            message.setEvidenceJson(json.write(evidence));
        }
        message.setErrorMessage(null);
        message.setUpdatedAt(now);
        message.getChat().setUpdatedAt(now);
        chatMessageRepository.save(message);
        chatRepository.save(message.getChat());
        return mapper.toChatMessage(message);
    }

    @Transactional
    public ChatMessageDto saveAssistantEvidence(
            String messageId,
            ChatEvidenceDto evidence
    ) {
        ChatMessageEntity message = chatMessageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Chat message not found: " + messageId));
        message.setEvidenceJson(json.write(evidence));
        message.setUpdatedAt(OffsetDateTime.now());
        chatMessageRepository.save(message);
        return mapper.toChatMessage(message);
    }

    @Transactional
    public ChatMessageDto failAssistantMessage(
            String messageId,
            String partialText,
            String error,
            boolean interrupted,
            long durationMs
    ) {
        ChatMessageEntity message = chatMessageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Chat message not found: " + messageId));
        OffsetDateTime now = OffsetDateTime.now();
        message.setText(partialText == null ? "" : partialText);
        message.setStatus(interrupted ? ChatMessageStatus.INTERRUPTED : ChatMessageStatus.FAILED);
        message.setErrorMessage(error);
        message.setGenerationDurationMs(durationMs);
        message.setUpdatedAt(now);
        message.getChat().setUpdatedAt(now);
        chatMessageRepository.save(message);
        chatRepository.save(message.getChat());
        return mapper.toChatMessage(message);
    }

    private void appendUserMessage(
            ChatEntity chat,
            AskAssistantRequestDto request,
            OffsetDateTime now
    ) {
        chat.addMessage(ChatMessageEntity.builder()
                .id("msg-user-" + UUID.randomUUID())
                .role(ChatMessageRole.USER)
                .text(request.text())
                .mentionsJson(json.write(safeMentions(request)))
                .citationsJson(json.write(List.of()))
                .evidenceJson(null)
                .status(ChatMessageStatus.COMPLETED)
                .requestId(request.requestId())
                .createdAt(now)
                .updatedAt(now)
                .build());
    }

    private List<EntityMentionDto> safeMentions(AskAssistantRequestDto request) {
        return request.mentions() == null ? List.of() : request.mentions();
    }

    private void initializeModelMemory(ChatEntity chat) {
        if (!chatMemory.get(chat.getId()).isEmpty()) {
            return;
        }

        List<Message> history = chat.getMessages().stream()
                .filter(message -> message.getStatus() == ChatMessageStatus.COMPLETED)
                .map(message -> message.getRole() == ChatMessageRole.USER
                        ? new UserMessage(message.getText())
                        : new AssistantMessage(message.getText()))
                .map(Message.class::cast)
                .toList();
        if (!history.isEmpty()) {
            chatMemory.add(chat.getId(), history);
        }
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

    public record PreparedChatTurn(
            ChatMessageDto assistantMessage,
            boolean existing
    ) {
    }
}
