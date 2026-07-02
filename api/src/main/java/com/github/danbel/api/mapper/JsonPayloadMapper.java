package com.github.danbel.api.mapper;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.util.List;

@Component
@RequiredArgsConstructor
public class JsonPayloadMapper {

    private final ObjectMapper objectMapper;

    public <T> List<T> readList(String json, TypeReference<List<T>> typeReference) {
        try {
            return objectMapper.readValue(json, typeReference);
        } catch (JacksonException exception) {
            throw new IllegalStateException("Cannot read JSON payload", exception);
        }
    }

    public <T> T read(String json, TypeReference<T> typeReference) {
        try {
            return objectMapper.readValue(json, typeReference);
        } catch (JacksonException exception) {
            throw new IllegalStateException("Cannot read JSON payload", exception);
        }
    }

    public String write(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JacksonException exception) {
            throw new IllegalStateException("Cannot write JSON payload", exception);
        }
    }
}
