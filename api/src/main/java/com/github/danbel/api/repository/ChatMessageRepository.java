package com.github.danbel.api.repository;

import com.github.danbel.api.model.entity.ChatMessageEntity;
import com.github.danbel.api.model.enums.ChatMessageRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ChatMessageRepository extends JpaRepository<ChatMessageEntity, String> {
    Optional<ChatMessageEntity> findByChat_IdAndRequestIdAndRole(
            String chatId,
            String requestId,
            ChatMessageRole role
    );
}
