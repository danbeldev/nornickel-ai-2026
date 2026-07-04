package com.github.danbel.api.service;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.regex.Pattern;

@Service
public class WebSearchRoutingService {

    private static final Pattern URL = Pattern.compile(
            "(?iu)https?://[^\\s<>\"']+"
    );
    private static final Pattern EXPLICIT_WEB_REQUEST = Pattern.compile(
            "(?iu)\\b(поищи|найди|посмотри|проверь|узнай)\\b.{0,48}"
                    + "\\b(в интернете|в сети|в открытых источниках|на сайте|онлайн|web|internet)\\b"
                    + "|\\b(поиск|поищи|найди)\\s+(в интернете|в сети|онлайн)\\b"
    );
    private static final Pattern POSSIBLY_EXTERNAL = Pattern.compile(
            "(?iu)\\b(последн(ие|яя|ий)|свеж(ие|ая|ий)|актуальн(ые|ая|ый)|"
                    + "новост(и|ях)|сейчас|сегодня|в интернете|в сети|"
                    + "открыт(ые|ых)\\s+источник|на сайте|публикаци|стать[яеию]|"
                    + "миров(ая|ой|ые)\\s+практик|за рубежом)\\b"
    );

    private final ChatModel chatModel;
    private final String routingModel;

    public WebSearchRoutingService(
            ChatModel chatModel,
            @Value("${app.query-pipeline.model:${spring.ai.openai.chat.options.model}}")
            String routingModel
    ) {
        this.chatModel = chatModel;
        this.routingModel = routingModel;
    }

    public WebSearchDecision decide(String query, boolean forcedByUser) {
        if (forcedByUser) {
            return new WebSearchDecision(true, "Режим включён пользователем.");
        }
        if (query == null || query.isBlank()) {
            return new WebSearchDecision(false, null);
        }
        if (URL.matcher(query).find()) {
            return new WebSearchDecision(
                    true,
                    "В запросе обнаружена ссылка на внешнюю страницу."
            );
        }
        if (EXPLICIT_WEB_REQUEST.matcher(query).find()) {
            return new WebSearchDecision(
                    true,
                    "Пользователь явно попросил выполнить поиск в интернете."
            );
        }
        if (!POSSIBLY_EXTERNAL.matcher(query).find()) {
            return new WebSearchDecision(false, null);
        }
        try {
            String result = ChatClient.builder(chatModel)
                    .defaultOptions(ChatOptions.builder()
                            .model(routingModel)
                            .temperature(0.0))
                    .build()
                    .prompt()
                    .system("""
                            Определи, нужен ли для ответа поиск в интернете.
                            Ответь только WEB или KNOWLEDGE.

                            WEB — пользователь явно просит найти, проверить или прочитать
                            актуальные внешние сведения либо внешнюю публикацию.
                            KNOWLEDGE — вопрос следует искать во внутренней базе знаний,
                            даже если в нём упомянуты статья, публикация или год.
                            Не выбирай WEB только потому, что внутренних данных может не хватить.
                            """)
                    .user(query)
                    .call()
                    .content();
            boolean useWeb = result != null
                    && result.strip().toUpperCase(Locale.ROOT).startsWith("WEB");
            return new WebSearchDecision(
                    useWeb,
                    useWeb
                            ? "Языковая модель выбрала инструмент поиска в интернете."
                            : null
            );
        } catch (Exception ignored) {
            return new WebSearchDecision(false, null);
        }
    }

    public record WebSearchDecision(
            boolean useOpenSources,
            String reason
    ) {
    }
}
