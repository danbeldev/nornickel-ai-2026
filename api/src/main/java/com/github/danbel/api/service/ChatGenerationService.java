package com.github.danbel.api.service;

import com.github.danbel.api.client.dto.GraphRagRetrieveResponseDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatGenerationService {

    private final ObjectProvider<ChatClient.Builder> chatClientBuilderProvider;

    public String generate(String userQuery, GraphRagRetrieveResponseDto retrieval) {
        ChatClient.Builder builder = chatClientBuilderProvider.getIfAvailable();

        if (builder == null) {
            return fallbackAnswer(userQuery, retrieval);
        }

        try {
            List<String> chunks = retrieval.contextChunks() == null ? List.of() : retrieval.contextChunks();
            String context = String.join("\n\n", chunks);
            String content = builder.build()
                    .prompt()
                    .system("""
                            Ты исследовательский ассистент для материаловедения.
                            Отвечай кратко, явно указывай ограничения данных и не выдумывай источники.
                            Если контекста недостаточно, скажи, какие документы или эксперименты нужны.
                            """)
                    .user("""
                            Вопрос пользователя:
                            %s

                            Подсказка GraphRAG:
                            %s

                            Контекст:
                            %s
                            """.formatted(userQuery, retrieval.answerHint(), context))
                    .call()
                    .content();

            return content == null || content.isBlank() ? fallbackAnswer(userQuery, retrieval) : content;
        } catch (Exception exception) {
            log.warn("LLM fallback used: {}", exception.getMessage());
            return fallbackAnswer(userQuery, retrieval);
        }
    }

    public Flux<String> stream(String userQuery, GraphRagRetrieveResponseDto retrieval) {
        ChatClient.Builder builder = chatClientBuilderProvider.getIfAvailable();
        if (builder == null) {
            return Flux.just(fallbackAnswer(userQuery, retrieval));
        }

        try {
            List<String> chunks = retrieval.contextChunks() == null ? List.of() : retrieval.contextChunks();
            String context = String.join("\n\n", chunks);
            return builder.build()
                    .prompt()
                    .system("""
                            Ты исследовательский ассистент для материаловедения.
                            Отвечай кратко, явно указывай ограничения данных и не выдумывай источники.
                            """)
                    .user("""
                            Вопрос пользователя:
                            %s

                            Подсказка GraphRAG:
                            %s

                            Контекст:
                            %s
                            """.formatted(userQuery, retrieval.answerHint(), context))
                    .stream()
                    .content()
                    .onErrorResume(exception -> {
                        log.warn("LLM stream fallback used: {}", exception.getMessage());
                        return Flux.just(fallbackAnswer(userQuery, retrieval));
                    });
        } catch (Exception exception) {
            log.warn("LLM stream fallback used: {}", exception.getMessage());
            return Flux.just(fallbackAnswer(userQuery, retrieval));
        }
    }

    private String fallbackAnswer(String userQuery, GraphRagRetrieveResponseDto retrieval) {
        return "По запросу «" + userQuery + "» найден связанный контекст в графе знаний. "
                + retrieval.answerHint() + " "
                + "Источников: " + retrieval.sourcesFound() + ", связанных экспериментов: " + retrieval.experimentsFound() + ".";
    }
}
