package com.github.danbel.api.config;

import lombok.RequiredArgsConstructor;
import org.apache.kafka.clients.admin.NewTopic;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.common.TopicPartition;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.listener.DeadLetterPublishingRecoverer;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.FixedBackOff;

@Configuration
@RequiredArgsConstructor
public class KafkaConfig {

    private final AppProperties properties;

    @Bean
    public NewTopic documentProcessingRequestedTopic() {
        return new NewTopic(properties.getKafka().getTopics().getDocumentProcessingRequested(), 1, (short) 1);
    }

    @Bean
    public NewTopic documentPublishRequestedTopic() {
        return new NewTopic(properties.getKafka().getTopics().getDocumentPublishRequested(), 1, (short) 1);
    }

    @Bean
    public NewTopic documentProcessingDlqTopic() {
        return new NewTopic(properties.getKafka().getTopics().getDocumentProcessingRequested() + ".dlq", 1, (short) 1);
    }

    @Bean
    public NewTopic documentPublishDlqTopic() {
        return new NewTopic(properties.getKafka().getTopics().getDocumentPublishRequested() + ".dlq", 1, (short) 1);
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, Object> kafkaListenerContainerFactory(
            ConsumerFactory<String, Object> consumerFactory,
            KafkaTemplate<String, Object> kafkaTemplate
    ) {
        DeadLetterPublishingRecoverer recoverer = new DeadLetterPublishingRecoverer(
                kafkaTemplate,
                (ConsumerRecord<?, ?> record, Exception exception) ->
                        new TopicPartition(record.topic() + ".dlq", record.partition())
        );
        DefaultErrorHandler errorHandler = new DefaultErrorHandler(recoverer, new FixedBackOff(1_000L, 3L));

        ConcurrentKafkaListenerContainerFactory<String, Object> factory = new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(consumerFactory);
        factory.setCommonErrorHandler(errorHandler);
        return factory;
    }
}
