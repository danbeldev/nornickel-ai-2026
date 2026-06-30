package com.github.danbel.api.repository;

import com.github.danbel.api.model.entity.ChatEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChatRepository extends JpaRepository<ChatEntity, String> {
    List<ChatEntity> findAllByOrderByUpdatedAtDesc();
}
