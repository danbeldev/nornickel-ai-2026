import json
from typing import Any

from neo4j_graphrag.experimental.components.resolver import (
    SinglePropertyExactMatchResolver,
)
from neo4j_graphrag.indexes import create_fulltext_index, create_vector_index

from .config import settings
from .extraction import embed_document, normalize_name
from .models import ExtractRequest, PublishRequest
from .resources import driver
from .schema import LABEL_BY_ENTITY_TYPE


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
    )
    chunks = await embed_document(document_request)
    if not chunks.chunks:
        raise ValueError("Нельзя опубликовать документ без текстовых фрагментов")

    ensure_constraints()
    replace_lexical_graph(
        document_id=document_id,
        title=request.title,
        document_type=request.type,
        chunks=chunks,
    )
    publish_entities(document_id, extraction.get("entities", []), chunks)
    publish_relations(document_id, extraction.get("relations", []))
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
                relation["id"] for relation in extraction.get("relations", [])
            ],
        }
    }


def ensure_constraints() -> None:
    queries = [
        "CREATE CONSTRAINT document_id_unique IF NOT EXISTS FOR (n:Document) REQUIRE n.id IS UNIQUE",
        "CREATE CONSTRAINT chunk_id_unique IF NOT EXISTS FOR (n:Chunk) REQUIRE n.id IS UNIQUE",
        "CREATE CONSTRAINT entity_id_unique IF NOT EXISTS FOR (n:__Entity__) REQUIRE n.id IS UNIQUE",
    ]
    for query in queries:
        driver.execute_query(query, database_=settings.neo4j_database)


def ensure_search_indexes(dimensions: int) -> None:
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
    chunks: Any,
) -> None:
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
            document.updatedAt = datetime()
        WITH document
        OPTIONAL MATCH (chunk:Chunk)-[:FROM_DOCUMENT]->(document)
        DETACH DELETE chunk
        """,
        parameters_={
            "document_id": document_id,
            "title": title,
            "document_type": document_type,
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
            entity.updatedAt = datetime()
        WITH entity, row
        CALL apoc.create.removeLabels(
            entity,
            [label IN labels(entity) WHERE label <> '__Entity__']
        ) YIELD node AS cleaned
        CALL apoc.create.addLabels(cleaned, [row.label]) YIELD node
        WITH node, row
        MATCH (chunk:Chunk {documentId: $document_id, page: row.page})
        MERGE (node)-[mention:MENTIONED_IN]->(chunk)
        SET mention.documentId = $document_id,
            mention.page = row.page
        """,
        parameters_={"document_id": document_id, "rows": rows},
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
            {documentId: row.documentId, page: row.page},
            target,
            {documentId: row.documentId, page: row.page}
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
