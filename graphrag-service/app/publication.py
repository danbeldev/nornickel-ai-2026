import hashlib
import json
from typing import Any

from neo4j_graphrag.experimental.components.resolver import (
    SinglePropertyExactMatchResolver,
)
from neo4j_graphrag.indexes import create_fulltext_index, create_vector_index

from .config import settings
from .extraction import embed_document, normalize_name
from .models import (
    DataIssueRequest,
    CreateRelationRequest,
    ExtractRequest,
    MergeEntitiesRequest,
    PublishRequest,
    RelationUpdateRequest,
    UpdateEntityRequest,
)
from .resources import driver
from .schema import LABEL_BY_ENTITY_TYPE, validate_relationship


VECTOR_INDEX_NAME = "chunk_embedding_index"
CHUNK_FULLTEXT_INDEX_NAME = "chunk_fulltext_index"
ENTITY_FULLTEXT_INDEX_NAME = "entity_fulltext_index"


async def publish_document(request: PublishRequest) -> dict[str, Any]:
    extraction = request.extraction.model_dump()
    document_id = str(extraction.get("documentId"))
    document_request = ExtractRequest(
        documentId=document_id,
        title=request.title,
        type=request.type,
        storageKey=request.storageKey,
        author=request.author,
        sourceUrl=request.sourceUrl,
        publishedAt=request.publishedAt,
    )
    chunks = await embed_document(document_request)
    if not chunks.chunks:
        raise ValueError("Нельзя опубликовать документ без текстовых фрагментов")

    ensure_constraints()
    replace_lexical_graph(
        document_id=document_id,
        title=request.title,
        document_type=request.type,
        author=request.author,
        source_url=request.sourceUrl,
        published_at=request.publishedAt,
        chunks=chunks,
    )
    entities = extraction.get("entities", [])
    relations = validate_relations(entities, extraction.get("relations", []))
    publish_entities(document_id, entities, chunks)
    publish_facts(document_id, entities)
    publish_relations(document_id, relations)
    await SinglePropertyExactMatchResolver(
        driver=driver,
        resolve_property="name",
        neo4j_database=settings.neo4j_database,
    ).run()
    ensure_search_indexes(len(chunks.chunks[0].metadata["embedding"]))

    return {
        "result": {
            "documentId": document_id,
            "publishedEntityIds": [
                entity["id"] for entity in extraction.get("entities", [])
            ],
            "publishedRelationIds": [
                relation["id"] for relation in relations
            ],
        }
    }


def validate_relations(
    entities: list[dict[str, Any]],
    relations: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    labels_by_id = {
        entity["id"]: LABEL_BY_ENTITY_TYPE.get(
            str(entity.get("type", "unclassified")),
            "Unclassified",
        )
        for entity in entities
    }
    validated: list[dict[str, Any]] = []
    for relation in relations:
        source_label = labels_by_id.get(relation.get("sourceId"))
        target_label = labels_by_id.get(relation.get("targetId"))
        if source_label is None or target_label is None:
            continue
        relationship_type = validate_relationship(
            source_label,
            str(relation.get("type", "")),
            target_label,
        )
        if relationship_type is None:
            continue
        validated.append({**relation, "type": relationship_type})
    return validated


def ensure_constraints() -> None:
    queries = [
        "CREATE CONSTRAINT document_id_unique IF NOT EXISTS FOR (n:Document) REQUIRE n.id IS UNIQUE",
        "CREATE CONSTRAINT chunk_id_unique IF NOT EXISTS FOR (n:Chunk) REQUIRE n.id IS UNIQUE",
        "CREATE CONSTRAINT entity_id_unique IF NOT EXISTS FOR (n:__Entity__) REQUIRE n.id IS UNIQUE",
    ]
    for query in queries:
        driver.execute_query(query, database_=settings.neo4j_database)


def ensure_search_indexes(dimensions: int) -> None:
    records, _, _ = driver.execute_query(
        """
        SHOW INDEXES YIELD name, options
        WHERE name = $name
        RETURN options
        """,
        parameters_={"name": VECTOR_INDEX_NAME},
        database_=settings.neo4j_database,
    )
    if records:
        options = dict(records[0]["options"] or {})
        index_config = dict(options.get("indexConfig") or {})
        current_dimensions = index_config.get("vector.dimensions")
        if (
            current_dimensions is not None
            and int(current_dimensions) != dimensions
        ):
            driver.execute_query(
                f"DROP INDEX {VECTOR_INDEX_NAME} IF EXISTS",
                database_=settings.neo4j_database,
            )

    create_vector_index(
        driver=driver,
        name=VECTOR_INDEX_NAME,
        label="Chunk",
        embedding_property="embedding",
        dimensions=dimensions,
        similarity_fn="cosine",
        fail_if_exists=False,
        neo4j_database=settings.neo4j_database,
    )
    create_fulltext_index(
        driver=driver,
        name=CHUNK_FULLTEXT_INDEX_NAME,
        label="Chunk",
        node_properties=["text"],
        fail_if_exists=False,
        neo4j_database=settings.neo4j_database,
    )
    create_fulltext_index(
        driver=driver,
        name=ENTITY_FULLTEXT_INDEX_NAME,
        label="__Entity__",
        node_properties=["name", "description", "normalizedName"],
        fail_if_exists=False,
        neo4j_database=settings.neo4j_database,
    )


def replace_lexical_graph(
    document_id: str,
    title: str,
    document_type: str,
    author: str | None,
    source_url: str | None,
    published_at: str | None,
    chunks: Any,
) -> None:
    driver.execute_query(
        """
        MATCH (fact:Fact {documentId: $document_id})
        DETACH DELETE fact
        """,
        parameters_={"document_id": document_id},
        database_=settings.neo4j_database,
    )
    driver.execute_query(
        """
        MATCH ()-[relation]->()
        WHERE relation.documentId = $document_id
        DELETE relation
        """,
        parameters_={"document_id": document_id},
        database_=settings.neo4j_database,
    )
    driver.execute_query(
        """
        MERGE (document:Document {id: $document_id})
        SET document.title = $title,
            document.type = $document_type,
            document.author = $author,
            document.sourceUrl = $source_url,
            document.publishedAt = $published_at,
            document.updatedAt = datetime()
        WITH document
        OPTIONAL MATCH (chunk:Chunk)-[:FROM_DOCUMENT]->(document)
        DETACH DELETE chunk
        """,
        parameters_={
            "document_id": document_id,
            "title": title,
            "document_type": document_type,
            "author": author,
            "source_url": source_url,
            "published_at": published_at,
        },
        database_=settings.neo4j_database,
    )

    rows = [
        {
            "id": chunk.uid,
            "index": chunk.index,
            "text": chunk.text,
            "page": int((chunk.metadata or {}).get("page", 1)),
            "section": str((chunk.metadata or {}).get("section", "")),
            "visualId": (chunk.metadata or {}).get("visualId"),
            "visualType": (chunk.metadata or {}).get("visualType"),
            "embedding": (chunk.metadata or {})["embedding"],
        }
        for chunk in chunks.chunks
    ]
    driver.execute_query(
        """
        MATCH (document:Document {id: $document_id})
        UNWIND $rows AS row
        MERGE (chunk:Chunk {id: row.id})
        SET chunk.index = row.index,
            chunk.text = row.text,
            chunk.page = row.page,
            chunk.section = row.section,
            chunk.visualId = row.visualId,
            chunk.visualType = row.visualType,
            chunk.documentId = $document_id
        WITH chunk, document, row
        CALL db.create.setNodeVectorProperty(chunk, 'embedding', row.embedding)
        WITH chunk, document
        MERGE (chunk)-[:FROM_DOCUMENT]->(document)
        """,
        parameters_={"document_id": document_id, "rows": rows},
        database_=settings.neo4j_database,
    )
    driver.execute_query(
        """
        MATCH (first:Chunk {documentId: $document_id})
        MATCH (second:Chunk {documentId: $document_id})
        WHERE second.index = first.index + 1
        MERGE (first)-[:NEXT_CHUNK]->(second)
        """,
        parameters_={"document_id": document_id},
        database_=settings.neo4j_database,
    )


def publish_entities(
    document_id: str,
    entities: list[dict[str, Any]],
    chunks: Any,
) -> None:
    if not entities:
        return
    available_pages = {
        int((chunk.metadata or {}).get("page", 1)) for chunk in chunks.chunks
    }
    rows = []
    for entity in entities:
        entity_type = str(entity.get("type", "unclassified"))
        label = LABEL_BY_ENTITY_TYPE.get(entity_type, "Unclassified")
        source = entity.get("source") or {}
        requested_page = int(source.get("page") or 1)
        page = requested_page if requested_page in available_pages else min(available_pages)
        attributes = entity.get("attributes") or []
        rows.append(
            {
                "id": entity["id"],
                "type": entity_type,
                "label": label,
                "name": entity.get("name") or label,
                "normalizedName": normalize_name(entity.get("name") or label),
                "description": describe_entity(entity),
                "attributesJson": json.dumps(
                    attributes,
                    ensure_ascii=False,
                    default=str,
                ),
                "page": page,
                "chunkId": source.get("chunkId"),
                "section": source.get("section"),
                "quote": source.get("quote"),
                "visualId": source.get("visualId"),
                "visualType": source.get("visualType"),
                "confidence": float(entity.get("confidence") or 0.7),
                # Publication happens only after the user confirms the extraction
                # draft, so Neo4j and PostgreSQL must expose the same status.
                "verificationStatus": "REVIEWED",
                "geography": entity.get("geography"),
                "publicationYear": entity.get("year"),
                "language": entity.get("language"),
            }
        )

    driver.execute_query(
        """
        UNWIND $rows AS row
        MERGE (entity:__Entity__ {id: row.id})
        SET entity.entityType = row.type,
            entity.name = row.name,
            entity.normalizedName = row.normalizedName,
            entity.description = row.description,
            entity.attributesJson = row.attributesJson,
            entity.confidence = row.confidence,
            entity.verificationStatus = row.verificationStatus,
            entity.geography = row.geography,
            entity.publicationYear = row.publicationYear,
            entity.language = row.language,
            entity.version = coalesce(entity.version, 0) + 1,
            entity.updatedAt = datetime()
        WITH entity, row
        CALL apoc.create.removeLabels(
            entity,
            [label IN labels(entity) WHERE label <> '__Entity__']
        ) YIELD node AS cleaned
        CALL apoc.create.addLabels(cleaned, [row.label]) YIELD node
        WITH node, row
        OPTIONAL MATCH (exact:Chunk {id: row.chunkId})
        OPTIONAL MATCH (visual:Chunk {
            documentId: $document_id,
            visualId: row.visualId
        })
        OPTIONAL MATCH (fallback:Chunk {documentId: $document_id, page: row.page})
        WITH node, row, exact, visual, head(collect(fallback)) AS fallbackChunk
        WITH node, row, coalesce(exact, visual, fallbackChunk) AS chunk
        FOREACH (_ IN CASE WHEN chunk IS NULL THEN [] ELSE [1] END |
            MERGE (node)-[mention:MENTIONED_IN]->(chunk)
            SET mention.documentId = $document_id,
                mention.page = row.page,
                mention.section = row.section,
                mention.quote = row.quote
        )
        """,
        parameters_={"document_id": document_id, "rows": rows},
        database_=settings.neo4j_database,
    )


def publish_facts(
    document_id: str,
    entities: list[dict[str, Any]],
) -> None:
    rows: list[dict[str, Any]] = []
    for entity in entities:
        source = entity.get("source") or {}
        for index, attribute in enumerate(entity.get("attributes") or []):
            identity = (
                f"{document_id}:{entity['id']}:{attribute.get('name')}:{index}"
            )
            rows.append({
                "id": "fact-" + hashlib.sha1(identity.encode("utf-8")).hexdigest()[:18],
                "entityId": entity["id"],
                "name": attribute.get("name") or "Параметр",
                "operator": attribute.get("operator"),
                "numericValue": attribute.get("numericValue"),
                "minValue": attribute.get("minValue"),
                "maxValue": attribute.get("maxValue"),
                "unit": attribute.get("unit"),
                "normalizedUnit": attribute.get("normalizedUnit"),
                "textValue": str(attribute.get("value", "")),
                "documentId": document_id,
                "page": int(source.get("page") or 1),
                "chunkId": source.get("chunkId"),
                "section": source.get("section"),
                "quote": source.get("quote"),
                "confidence": float(entity.get("confidence") or 0.7),
            })
    if not rows:
        return
    driver.execute_query(
        """
        UNWIND $rows AS row
        MATCH (entity:__Entity__ {id: row.entityId})
        MERGE (fact:Fact {id: row.id})
        SET fact.name = row.name,
            fact.operator = row.operator,
            fact.numericValue = row.numericValue,
            fact.minValue = row.minValue,
            fact.maxValue = row.maxValue,
            fact.unit = row.unit,
            fact.normalizedUnit = row.normalizedUnit,
            fact.textValue = row.textValue,
            fact.documentId = row.documentId,
            fact.page = row.page,
            fact.sourceChunkId = row.chunkId,
            fact.sourceSection = row.section,
            fact.sourceQuote = row.quote,
            fact.confidence = row.confidence,
            fact.updatedAt = datetime()
        MERGE (entity)-[relation:HAS_FACT]->(fact)
        SET relation.documentId = row.documentId,
            relation.page = row.page,
            relation.sourceChunkId = row.chunkId,
            relation.sourceSection = row.section,
            relation.sourceQuote = row.quote
        """,
        parameters_={"rows": rows},
        database_=settings.neo4j_database,
    )


def publish_relations(
    document_id: str,
    relations: list[dict[str, Any]],
) -> None:
    if not relations:
        return
    rows = [
        {
            "id": relation["id"],
            "sourceId": relation["sourceId"],
            "targetId": relation["targetId"],
            "type": sanitize_relationship_type(relation["type"]),
            "page": int((relation.get("source") or {}).get("page") or 1),
            "chunkId": (relation.get("source") or {}).get("chunkId"),
            "section": (relation.get("source") or {}).get("section"),
            "quote": (relation.get("source") or {}).get("quote"),
            "documentId": document_id,
        }
        for relation in relations
    ]
    driver.execute_query(
        """
        UNWIND $rows AS row
        MATCH (source:__Entity__ {id: row.sourceId})
        MATCH (target:__Entity__ {id: row.targetId})
        CALL apoc.merge.relationship(
            source,
            row.type,
            {id: row.id},
            {
                documentId: row.documentId,
                page: row.page,
                sourceChunkId: row.chunkId,
                sourceSection: row.section,
                sourceQuote: row.quote
            },
            target,
            {
                documentId: row.documentId,
                page: row.page,
                sourceChunkId: row.chunkId,
                sourceSection: row.section,
                sourceQuote: row.quote
            }
        ) YIELD rel
        RETURN count(rel) AS published
        """,
        parameters_={"rows": rows},
        database_=settings.neo4j_database,
    )


def describe_entity(entity: dict[str, Any]) -> str:
    attributes = entity.get("attributes") or []
    if not attributes:
        return str(entity.get("name", ""))
    values = [
        f"{attribute.get('name')}: {attribute.get('value')}"
        + (f" {attribute.get('unit')}" if attribute.get("unit") else "")
        for attribute in attributes[:8]
    ]
    return "; ".join(values)


def sanitize_relationship_type(value: str) -> str:
    normalized = "".join(
        character if character.isalnum() else "_"
        for character in value.upper()
    ).strip("_")
    return normalized or "RELATED_TO"


def update_entity(request: UpdateEntityRequest) -> None:
    label = LABEL_BY_ENTITY_TYPE.get(request.type, "Unclassified")
    records, _, _ = driver.execute_query(
        """
        MATCH (entity:__Entity__ {id: $id})
        SET entity.entityType = $type,
            entity.name = $name,
            entity.normalizedName = $normalized_name,
            entity.description = $description,
            entity.attributesJson = $attributes_json,
            entity.confidence = $confidence,
            entity.verificationStatus = $verification_status,
            entity.geography = $geography,
            entity.publicationYear = $publication_year,
            entity.language = $language,
            entity.version = coalesce(entity.version, 0) + 1,
            entity.updatedAt = datetime()
        WITH entity
        CALL apoc.create.removeLabels(
            entity,
            [item IN labels(entity) WHERE item <> '__Entity__']
        ) YIELD node AS cleaned
        CALL apoc.create.addLabels(cleaned, [$label]) YIELD node
        RETURN node.id AS id
        """,
        parameters_={
            "id": request.id,
            "type": request.type,
            "name": request.name,
            "normalized_name": normalize_name(request.name),
            "description": request.description,
            "attributes_json": json.dumps(
                [attribute.model_dump() for attribute in request.attributes],
                ensure_ascii=False,
            ),
            "confidence": request.confidence,
            "verification_status": request.verificationStatus,
            "geography": request.geography,
            "publication_year": request.publicationYear,
            "language": request.language,
            "label": label,
        },
        database_=settings.neo4j_database,
    )
    if not records:
        raise ValueError(f"Entity not found: {request.id}")
    driver.execute_query(
        """
        MATCH (entity:__Entity__ {id: $id})-[:HAS_FACT]->(fact:Fact)
        WHERE fact.documentId IS NULL
        DETACH DELETE fact
        """,
        parameters_={"id": request.id},
        database_=settings.neo4j_database,
    )
    rows = []
    for index, attribute in enumerate(request.attributes):
        identity = f"manual:{request.id}:{attribute.name}:{index}"
        rows.append({
            "id": "fact-" + hashlib.sha1(identity.encode("utf-8")).hexdigest()[:18],
            "entityId": request.id,
            "name": attribute.name,
            "operator": attribute.operator,
            "numericValue": attribute.numericValue,
            "minValue": attribute.minValue,
            "maxValue": attribute.maxValue,
            "unit": attribute.unit,
            "normalizedUnit": attribute.normalizedUnit,
            "textValue": str(attribute.value),
            "confidence": request.confidence,
        })
    if rows:
        driver.execute_query(
            """
            UNWIND $rows AS row
            MATCH (entity:__Entity__ {id: row.entityId})
            MERGE (fact:Fact {id: row.id})
            SET fact += row,
                fact.updatedAt = datetime()
            MERGE (entity)-[:HAS_FACT]->(fact)
            """,
            parameters_={"rows": rows},
            database_=settings.neo4j_database,
        )


def upsert_data_issue(request: DataIssueRequest) -> None:
    driver.execute_query(
        """
        MERGE (issue:__Entity__:DataIssue {id: $id})
        SET issue.entityType = 'data_issue',
            issue.name = $title,
            issue.normalizedName = $normalized_name,
            issue.description = $description,
            issue.issueType = $issue_type,
            issue.severity = $severity,
            issue.recommendation = $recommendation,
            issue.verificationStatus = 'DETECTED',
            issue.updatedAt = datetime()
        WITH issue
        OPTIONAL MATCH (issue)-[old:RELATED_TO]->()
        DELETE old
        WITH issue
        UNWIND $related_ids AS related_id
        MATCH (related:__Entity__ {id: related_id})
        MERGE (issue)-[:RELATED_TO]->(related)
        """,
        parameters_={
            "id": request.id,
            "title": request.title,
            "normalized_name": normalize_name(request.title),
            "description": request.description,
            "issue_type": request.issueType,
            "severity": request.severity,
            "recommendation": request.recommendation,
            "related_ids": request.relatedEntityIds,
        },
        database_=settings.neo4j_database,
    )


def update_relation(request: RelationUpdateRequest) -> None:
    records, _, _ = driver.execute_query(
        """
        MATCH (source:__Entity__)-[relation {id: $id}]->(target:__Entity__)
        RETURN source.id AS sourceId,
               target.id AS targetId,
               type(relation) AS relationType,
               properties(relation) AS properties
        """,
        parameters_={"id": request.id},
        database_=settings.neo4j_database,
    )
    if not records:
        raise ValueError(f"Relation not found: {request.id}")
    current = records[0]
    relation_type = sanitize_relationship_type(request.relationType)
    if current["relationType"] == relation_type:
        return
    driver.execute_query(
        """
        MATCH (source:__Entity__ {id: $source_id})
        MATCH (target:__Entity__ {id: $target_id})
        MATCH (source)-[old {id: $id}]->(target)
        CALL apoc.create.relationship(
            source,
            $relation_type,
            $properties,
            target
        ) YIELD rel
        DELETE old
        RETURN rel.id AS id
        """,
        parameters_={
            "id": request.id,
            "source_id": current["sourceId"],
            "target_id": current["targetId"],
            "relation_type": relation_type,
            "properties": dict(current["properties"]),
        },
        database_=settings.neo4j_database,
    )


def create_relation(request: CreateRelationRequest) -> None:
    records, _, _ = driver.execute_query(
        """
        MATCH (source:__Entity__ {id: $source_id})
        MATCH (target:__Entity__ {id: $target_id})
        CALL apoc.create.relationship(
            source,
            $relation_type,
            {id: $id, origin: 'manual', updatedAt: toString(datetime())},
            target
        ) YIELD rel
        RETURN rel.id AS id
        """,
        parameters_={
            "id": request.id,
            "source_id": request.sourceId,
            "target_id": request.targetId,
            "relation_type": sanitize_relationship_type(request.relationType),
        },
        database_=settings.neo4j_database,
    )
    if not records:
        raise ValueError("Source or target entity not found")


def delete_relation(relation_id: str) -> None:
    records, _, _ = driver.execute_query(
        """
        MATCH ()-[relation {id: $id}]->()
        WITH relation, relation.id AS id
        DELETE relation
        RETURN id
        """,
        parameters_={"id": relation_id},
        database_=settings.neo4j_database,
    )
    if not records:
        raise ValueError(f"Relation not found: {relation_id}")


def merge_entities(request: MergeEntitiesRequest) -> None:
    if request.sourceId == request.targetId:
        raise ValueError("Source and target entities must be different")
    records, _, _ = driver.execute_query(
        """
        MATCH (source:__Entity__ {id: $source_id})
        MATCH (target:__Entity__ {id: $target_id})
        WHERE source.entityType = target.entityType
        SET target.description = CASE
                WHEN size(coalesce(target.description, '')) >= size(coalesce(source.description, ''))
                THEN target.description ELSE source.description END,
            target.confidence = CASE
                WHEN coalesce(target.confidence, 0) >= coalesce(source.confidence, 0)
                THEN target.confidence ELSE source.confidence END,
            target.version = coalesce(target.version, 0) + 1,
            target.updatedAt = datetime()
        RETURN source.id AS sourceId, target.id AS targetId
        """,
        parameters_={
            "source_id": request.sourceId,
            "target_id": request.targetId,
        },
        database_=settings.neo4j_database,
    )
    if not records:
        raise ValueError("Entities not found or their types differ")
    driver.execute_query(
        """
        MATCH (source:__Entity__ {id: $source_id})
        MATCH (target:__Entity__ {id: $target_id})
        CALL {
            WITH source, target
            MATCH (source)-[relation]->(neighbor)
            WHERE neighbor <> target
            CALL apoc.merge.relationship(
                target, type(relation), {}, properties(relation), neighbor, properties(relation)
            ) YIELD rel
            RETURN count(rel) AS outgoing
        }
        CALL {
            WITH source, target
            MATCH (neighbor)-[relation]->(source)
            WHERE neighbor <> target
            CALL apoc.merge.relationship(
                neighbor, type(relation), {}, properties(relation), target, properties(relation)
            ) YIELD rel
            RETURN count(rel) AS incoming
        }
        WITH source, target, outgoing, incoming
        DETACH DELETE source
        RETURN target.id AS id
        """,
        parameters_={
            "source_id": request.sourceId,
            "target_id": request.targetId,
        },
        database_=settings.neo4j_database,
    )
