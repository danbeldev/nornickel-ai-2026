import hashlib
import json
import re
from typing import Any

from neo4j_graphrag.experimental.components.embedder import TextChunkEmbedder
from neo4j_graphrag.experimental.components.entity_relation_extractor import (
    LLMEntityRelationExtractor,
    OnError,
)
from neo4j_graphrag.experimental.components.schema import SchemaBuilder
from neo4j_graphrag.experimental.components.types import (
    DocumentInfo,
    Neo4jGraph,
    Neo4jNode,
    TextChunks,
)
from neo4j_graphrag.experimental.pipeline import Pipeline
from rapidfuzz import fuzz, process, utils

from .config import settings
from .loaders import load_source_pages, split_source_pages
from .models import ExtractRequest
from .resources import driver, embedder, extraction_llm
from .schema import ENTITY_TYPE_BY_LABEL, SCHEMA_INPUT


LEXICAL_LABELS = {"Document", "Chunk"}
DOCUMENT_SCOPED_TYPES = {
    "experiment",
    "conclusion",
    "data_issue",
    "unclassified",
}


async def embed_document(request: ExtractRequest) -> TextChunks:
    chunks = await load_document_chunks(request)
    return await TextChunkEmbedder(embedder=embedder, max_concurrency=3).run(chunks)


async def load_document_chunks(request: ExtractRequest) -> TextChunks:
    pages = load_source_pages(request)
    chunks = await split_source_pages(request.documentId, pages)
    if not chunks.chunks:
        raise ValueError("В документе не найден текст для обработки")
    return chunks


async def extract_document(request: ExtractRequest) -> dict[str, Any]:
    chunks = await load_document_chunks(request)
    graph = await run_extraction_pipeline(request, chunks)
    return graph_to_draft(request, graph)


async def run_extraction_pipeline(
    request: ExtractRequest,
    chunks: TextChunks,
) -> Neo4jGraph:
    pipeline = Pipeline()
    pipeline.add_component(
        TextChunkEmbedder(embedder=embedder, max_concurrency=3),
        "chunk_embedder",
    )
    pipeline.add_component(SchemaBuilder(), "schema")
    pipeline.add_component(
        LLMEntityRelationExtractor(
            llm=extraction_llm,
            on_error=OnError.RAISE,
            use_structured_output=False,
            create_lexical_graph=True,
        ),
        "extractor",
    )
    pipeline.connect(
        "chunk_embedder",
        "extractor",
        input_config={"chunks": "chunk_embedder"},
    )
    pipeline.connect(
        "schema",
        "extractor",
        input_config={"schema": "schema"},
    )

    result = await pipeline.run(
        {
            "chunk_embedder": {"text_chunks": chunks},
            "schema": SCHEMA_INPUT,
            "extractor": {
                "document_info": DocumentInfo(
                    uid=request.documentId,
                    path=request.title,
                    metadata={
                        "documentId": request.documentId,
                        "title": request.title,
                        "type": request.type,
                    },
                )
            },
        }
    )
    return unwrap_graph(result.result)


def unwrap_graph(value: Any) -> Neo4jGraph:
    if isinstance(value, Neo4jGraph):
        return value
    if isinstance(value, dict):
        if "nodes" in value and "relationships" in value:
            return Neo4jGraph.model_validate(value)
        for nested in value.values():
            try:
                return unwrap_graph(nested)
            except (TypeError, ValueError):
                continue
    raise ValueError("KG Builder pipeline did not return a Neo4jGraph")


def graph_to_draft(
    request: ExtractRequest,
    graph: Neo4jGraph,
) -> dict[str, Any]:
    chunks = {
        node.id: node
        for node in graph.nodes
        if node.label == "Chunk"
    }
    source_chunk_by_node: dict[str, str] = {}
    for relation in graph.relationships:
        if relation.type == "FROM_CHUNK":
            source_chunk_by_node[relation.start_node_id] = relation.end_node_id

    entity_nodes = [
        node for node in graph.nodes if node.label not in LEXICAL_LABELS
    ]
    id_mapping = resolve_entity_ids(request.documentId, entity_nodes)
    entities_by_id: dict[str, dict[str, Any]] = {}
    warnings: list[str] = []

    for node in entity_nodes:
        entity_type = ENTITY_TYPE_BY_LABEL.get(node.label, "unclassified")
        if entity_type == "unclassified" and node.label != "Unclassified":
            warnings.append(
                f"Тип сущности «{node.label}» преобразован в unclassified."
            )
        name = entity_name(node)
        chunk = chunks.get(source_chunk_by_node.get(node.id, ""))
        page = int((chunk.properties if chunk else {}).get("page", 1))
        entity_id = id_mapping[node.id]
        entities_by_id[entity_id] = {
            "id": entity_id,
            "type": entity_type,
            "name": name,
            "attributes": [
                {
                    "name": humanize_property(key),
                    "value": json_value(value),
                    "unit": None,
                }
                for key, value in node.properties.items()
                if key not in {"name", "title"}
            ],
            "source": {
                "documentId": request.documentId,
                "page": page,
            },
        }

    relations_by_id: dict[str, dict[str, Any]] = {}
    for relation in graph.relationships:
        if relation.start_node_id not in id_mapping or relation.end_node_id not in id_mapping:
            continue
        source_id = id_mapping[relation.start_node_id]
        target_id = id_mapping[relation.end_node_id]
        relation_id = stable_id(
            "relation",
            f"{request.documentId}:{source_id}:{relation.type}:{target_id}",
        )
        source = entities_by_id.get(source_id, {}).get(
            "source",
            {"documentId": request.documentId, "page": 1},
        )
        relations_by_id[relation_id] = {
            "id": relation_id,
            "sourceId": source_id,
            "type": relation.type,
            "targetId": target_id,
            "source": source,
        }

    if not entities_by_id:
        warnings.append("KG Builder не извлек сущности из документа.")

    return {
        "documentId": request.documentId,
        "entities": list(entities_by_id.values()),
        "relations": list(relations_by_id.values()),
        "warnings": warnings,
    }


def resolve_entity_ids(
    document_id: str,
    nodes: list[Neo4jNode],
) -> dict[str, str]:
    existing = load_existing_entities()
    mapping: dict[str, str] = {}
    assigned: dict[tuple[str, str], str] = {}

    for node in nodes:
        entity_type = ENTITY_TYPE_BY_LABEL.get(node.label, "unclassified")
        name = entity_name(node)
        normalized = normalize_name(name)
        key = (entity_type, normalized)
        if key in assigned:
            mapping[node.id] = assigned[key]
            continue

        candidates = [
            candidate
            for candidate in existing
            if candidate["type"] == entity_type
        ]
        match = process.extractOne(
            normalized,
            {candidate["id"]: candidate["normalizedName"] for candidate in candidates},
            scorer=fuzz.WRatio,
            processor=utils.default_process,
        )
        if match and match[1] / 100 >= settings.entity_resolution_threshold:
            resolved_id = match[2]
        else:
            identity = (
                f"{document_id}:{normalized}"
                if entity_type in DOCUMENT_SCOPED_TYPES
                else normalized
            )
            resolved_id = stable_id(entity_type, identity)

        mapping[node.id] = resolved_id
        assigned[key] = resolved_id
    return mapping


def load_existing_entities() -> list[dict[str, str]]:
    records, _, _ = driver.execute_query(
        """
        MATCH (entity:__Entity__)
        RETURN entity.id AS id,
               entity.entityType AS type,
               coalesce(entity.normalizedName, toLower(entity.name)) AS normalizedName
        """,
        database_=settings.neo4j_database,
    )
    return [
        {
            "id": str(record["id"]),
            "type": str(record["type"]),
            "normalizedName": str(record["normalizedName"]),
        }
        for record in records
        if record["id"] and record["type"] and record["normalizedName"]
    ]


def entity_name(node: Neo4jNode) -> str:
    return str(
        node.properties.get("name")
        or node.properties.get("title")
        or node.label
    ).strip()


def normalize_name(value: str) -> str:
    return re.sub(r"[^a-zа-яё0-9]+", " ", value.lower()).strip()


def stable_id(prefix: str, value: str) -> str:
    digest = hashlib.sha1(value.encode("utf-8")).hexdigest()[:18]
    return f"{prefix}-{digest}"


def humanize_property(value: str) -> str:
    return value.replace("_", " ").strip().capitalize()


def json_value(value: Any) -> str | int | float | bool:
    if isinstance(value, (str, int, float, bool)):
        return value
    return json.dumps(value, ensure_ascii=False, default=str)
