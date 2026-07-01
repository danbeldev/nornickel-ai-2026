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
        private int readTimeoutSeconds = 900;
    }

    @Getter
    @Setter
    public static class Ingestion {
        private boolean processImmediately = true;
    }
}
