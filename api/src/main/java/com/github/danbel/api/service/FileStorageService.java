package com.github.danbel.api.service;

import com.github.danbel.api.config.AppProperties;
import io.minio.BucketExistsArgs;
import io.minio.GetObjectArgs;
import io.minio.GetObjectResponse;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.StatObjectArgs;
import io.minio.StatObjectResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.io.ByteArrayInputStream;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FileStorageService {

    private final AppProperties properties;
    private final MinioClient minioClient;

    public String store(MultipartFile file) {
        try {
            String safeName = file.getOriginalFilename() == null ? "document" : file.getOriginalFilename().replaceAll("[^a-zA-Z0-9._-]", "_");
            String objectKey = UUID.randomUUID() + "-" + safeName;
            ensureBucket();
            minioClient.putObject(PutObjectArgs.builder()
                    .bucket(properties.getStorage().getMinioBucket())
                    .object(objectKey)
                    .stream(file.getInputStream(), file.getSize(), -1)
                    .contentType(file.getContentType())
                    .build());
            return objectKey;
        } catch (Exception exception) {
            throw new IllegalStateException("Cannot store uploaded document", exception);
        }
    }

    public String store(
            String filename,
            String contentType,
            byte[] content
    ) {
        try {
            String safeName = filename == null
                    ? "document"
                    : filename.replaceAll("[^a-zA-Z0-9._-]", "_");
            String objectKey = UUID.randomUUID() + "-" + safeName;
            ensureBucket();
            minioClient.putObject(PutObjectArgs.builder()
                    .bucket(properties.getStorage().getMinioBucket())
                    .object(objectKey)
                    .stream(new ByteArrayInputStream(content), content.length, -1)
                    .contentType(contentType)
                    .build());
            return objectKey;
        } catch (Exception exception) {
            throw new IllegalStateException("Cannot store remote document", exception);
        }
    }

    public StoredFile open(String objectKey) {
        try {
            StatObjectResponse metadata = minioClient.statObject(
                    StatObjectArgs.builder()
                            .bucket(properties.getStorage().getMinioBucket())
                            .object(objectKey)
                            .build()
            );
            GetObjectResponse content = minioClient.getObject(
                    GetObjectArgs.builder()
                            .bucket(properties.getStorage().getMinioBucket())
                            .object(objectKey)
                            .build()
            );
            return new StoredFile(content, metadata.contentType(), metadata.size());
        } catch (Exception exception) {
            throw new IllegalStateException("Cannot read stored document", exception);
        }
    }

    private void ensureBucket() throws Exception {
        boolean exists = minioClient.bucketExists(BucketExistsArgs.builder()
                .bucket(properties.getStorage().getMinioBucket())
                .build());
        if (!exists) {
            minioClient.makeBucket(MakeBucketArgs.builder()
                    .bucket(properties.getStorage().getMinioBucket())
                    .build());
        }
    }

    public record StoredFile(
            InputStream content,
            String contentType,
            long size
    ) {
    }
}
