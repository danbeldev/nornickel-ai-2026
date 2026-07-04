package com.github.danbel.api.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private Cors cors = new Cors();
    private Storage storage = new Storage();
    private Kafka kafka = new Kafka();
    private GraphRag graphrag = new GraphRag();
    private WebSearch webSearch = new WebSearch();
    private RemoteDocuments remoteDocuments = new RemoteDocuments();
    private Ingestion ingestion = new Ingestion();

    @Getter
    @Setter
    public static class Cors {
        private List<String> allowedOrigins = new ArrayList<>();
    }

    @Getter
    @Setter
    public static class Storage {
        private String documentPath;
        private String minioEndpoint;
        private String minioAccessKey;
        private String minioSecretKey;
        private String minioBucket;
    }

    @Getter
    @Setter
    public static class Kafka {
        private Topics topics = new Topics();
    }

    @Getter
    @Setter
    public static class Topics {
        private String documentProcessingRequested;
        private String documentPublishRequested;
    }

    @Getter
    @Setter
    public static class GraphRag {
        private String baseUrl;
        private int connectTimeoutSeconds = 5;
        private int readTimeoutSeconds = 3600;
    }

    @Getter
    @Setter
    public static class WebSearch {
        private boolean enabled = true;
        private String baseUrl;
        private String apiKey;
        private String folderId;
        private int resultLimit = 5;
        private int maxContentCharacters = 4000;
        private int maxDownloadBytes = 1_500_000;
        private int requestTimeoutSeconds = 20;
    }

    @Getter
    @Setter
    public static class RemoteDocuments {
        private int maxDownloadBytes = 50_000_000;
        private int requestTimeoutSeconds = 30;
        private int maxRedirects = 3;
    }

    @Getter
    @Setter
    public static class Ingestion {
        private boolean processImmediately = true;
    }

}
