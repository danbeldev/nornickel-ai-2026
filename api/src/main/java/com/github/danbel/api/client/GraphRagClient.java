package com.github.danbel.api.client;

import com.github.danbel.api.client.dto.GraphRagExtractRequestDto;
import com.github.danbel.api.client.dto.GraphRagPublishRequestDto;
import com.github.danbel.api.client.dto.GraphRagPublishResponseDto;
import com.github.danbel.api.client.dto.GraphRagRetrieveRequestDto;
import com.github.danbel.api.client.dto.GraphRagRetrieveResponseDto;
import com.github.danbel.api.client.dto.GraphRagUpdateEntityRequestDto;
import com.github.danbel.api.client.dto.GraphRagDataIssueRequestDto;
import com.github.danbel.api.client.dto.GraphRagMergeEntitiesRequestDto;
import com.github.danbel.api.client.dto.GraphRagRelationUpdateRequestDto;
import com.github.danbel.api.client.dto.GraphRagCreateRelationRequestDto;
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

    @RequestLine("PUT /internal/graphrag/entities/{entityId}")
    @Headers("Content-Type: application/json")
    void updateEntity(
            @Param("entityId") String entityId,
            GraphRagUpdateEntityRequestDto request
    );

    @RequestLine("PUT /internal/graphrag/data-issues/{issueId}")
    @Headers("Content-Type: application/json")
    void upsertDataIssue(
            @Param("issueId") String issueId,
            GraphRagDataIssueRequestDto request
    );

    @RequestLine("PUT /internal/graphrag/relations/{relationId}")
    @Headers("Content-Type: application/json")
    void updateRelation(
            @Param("relationId") String relationId,
            GraphRagRelationUpdateRequestDto request
    );

    @RequestLine("POST /internal/graphrag/relations")
    @Headers("Content-Type: application/json")
    void createRelation(GraphRagCreateRelationRequestDto request);

    @RequestLine("DELETE /internal/graphrag/relations/{relationId}")
    void deleteRelation(@Param("relationId") String relationId);

    @RequestLine("POST /internal/graphrag/entities/merge")
    @Headers("Content-Type: application/json")
    void mergeEntities(GraphRagMergeEntitiesRequestDto request);
}
