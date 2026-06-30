package com.github.danbel.api.service;

import com.github.danbel.api.config.AppProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FileStorageService {

    private final AppProperties properties;

    public String store(MultipartFile file) {
        try {
            Path directory = Path.of(properties.getStorage().getDocumentPath()).toAbsolutePath().normalize();
            Files.createDirectories(directory);
            String safeName = file.getOriginalFilename() == null ? "document" : file.getOriginalFilename().replaceAll("[^a-zA-Z0-9._-]", "_");
            Path target = directory.resolve(UUID.randomUUID() + "-" + safeName).normalize();
            file.transferTo(target);
            return target.toString();
        } catch (IOException exception) {
            throw new IllegalStateException("Cannot store uploaded document", exception);
        }
    }
}
