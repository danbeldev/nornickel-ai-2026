package com.github.danbel.api.client;

import com.github.danbel.api.client.dto.GraphRagExtractRequestDto;
import com.github.danbel.api.client.dto.GraphRagPublishRequestDto;
import com.github.danbel.api.client.dto.GraphRagPublishResponseDto;
import com.github.danbel.api.client.dto.GraphRagRetrieveRequestDto;
import com.github.danbel.api.client.dto.GraphRagRetrieveResponseDto;
import com.github.danbel.api.dto.document.DocumentExtractionResultDto;
import feign.Headers;
import feign.Param;
import feign.RequestLine;

public interface GraphRagClient {

    @RequestLine("POST /internal/graphrag/retrieve")
    @Headers("Content-Type: application/json")
    GraphRagRetrieveResponseDto retrieve(GraphRagRetrieveRequestDto request);

    @RequestLine("POST /internal/graphrag/extract")
    @Headers("Content-Type: application/json")
    DocumentExtractionResultDto extract(GraphRagExtractRequestDto request);

    @RequestLine("POST /internal/graphrag/publish")
    @Headers("Content-Type: application/json")
    GraphRagPublishResponseDto publish(GraphRagPublishRequestDto request);

    @RequestLine("POST /internal/graphrag/operations/{jobId}/cancel")
    void cancel(@Param("jobId") String jobId);
}
