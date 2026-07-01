package com.github.danbel.api.config;

import com.github.danbel.api.client.GraphRagClient;
import feign.Feign;
import feign.Request;
import feign.jackson.JacksonDecoder;
import feign.jackson.JacksonEncoder;
import feign.slf4j.Slf4jLogger;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.minio.MinioClient;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.memory.ChatMemoryRepository;
import org.springframework.ai.chat.memory.MessageWindowChatMemory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.concurrent.Executor;
import java.util.concurrent.TimeUnit;

@Configuration
@RequiredArgsConstructor
@EnableConfigurationProperties(AppProperties.class)
public class ApiConfig {

    private final AppProperties properties;

    @Bean
    public GraphRagClient graphRagClient() {
        return Feign.builder()
                .encoder(new JacksonEncoder())
                .decoder(new JacksonDecoder())
                .logger(new Slf4jLogger(GraphRagClient.class))
                .options(new Request.Options(
                        properties.getGraphrag().getConnectTimeoutSeconds(),
                        TimeUnit.SECONDS,
                        properties.getGraphrag().getReadTimeoutSeconds(),
                        TimeUnit.SECONDS,
                        true
                ))
                .target(GraphRagClient.class, properties.getGraphrag().getBaseUrl());
    }

    @Bean
    public ChatMemory chatMemory(ChatMemoryRepository repository) {
        return MessageWindowChatMemory.builder()
                .chatMemoryRepository(repository)
                .maxMessages(20)
                .build();
    }

    @Bean
    public MessageChatMemoryAdvisor messageChatMemoryAdvisor(ChatMemory chatMemory) {
        return MessageChatMemoryAdvisor.builder(chatMemory).build();
    }

    @Bean
    public MinioClient minioClient() {
        return MinioClient.builder()
                .endpoint(properties.getStorage().getMinioEndpoint())
                .credentials(properties.getStorage().getMinioAccessKey(), properties.getStorage().getMinioSecretKey())
                .build();
    }

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                        .allowedOrigins(properties.getCors().getAllowedOrigins().toArray(String[]::new))
                        .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                        .allowedHeaders("*")
                        .allowCredentials(true);
            }
        };
    }

    @Bean
    public Executor chatStreamExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setThreadNamePrefix("chat-stream-");
        executor.setCorePoolSize(4);
        executor.setMaxPoolSize(12);
        executor.initialize();
        return executor;
    }

    @Bean
    public OpenAPI openApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Nornickel AI Science API")
                        .version("0.1.0")
                        .description("API for knowledge graph, documents, GraphRAG chat and data quality issues."));
    }
}
