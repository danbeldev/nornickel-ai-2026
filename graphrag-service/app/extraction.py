import asyncio
import hashlib
import json
import re
import time
from typing import Any

from neo4j_graphrag.experimental.components.embedder import TextChunkEmbedder
from neo4j_graphrag.experimental.components.entity_relation_extractor import (
    LLMEntityRelationExtractor,
    OnError,
)
from neo4j_graphrag.experimental.components.lexical_graph import LexicalGraphBuilder
from neo4j_graphrag.experimental.components.schema import SchemaBuilder
from neo4j_graphrag.experimental.components.types import (
    DocumentInfo,
    Neo4jGraph,
    Neo4jNode,
    TextChunks,
)
from rapidfuzz import fuzz, process, utils

from .config import settings
from .loaders import load_source_pages, split_source_pages
from .models import ExtractRequest
from .operations import OperationCanceled, operations, report_progress
from .resources import driver, embedder, extraction_llm
from .schema import ENTITY_TYPE_BY_LABEL, SCHEMA_INPUT, validate_relationship


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
    if not request.jobId:
        raise ValueError("jobId обязателен для извлечения документа")
    job_id = request.jobId
    operations.start(job_id)
    try:
        await report_progress(job_id, 10, "Загрузка и чтение документа")
        chunks = await load_document_chunks(request)
        await report_progress(
            job_id,
            20,
            f"Документ разделён на фрагменты: {len(chunks.chunks)}",
        )
        graph = await run_extraction_pipeline(request, chunks, job_id)
        await report_progress(job_id, 90, "Объединение сущностей и устранение дублей")
        draft = graph_to_draft(request, graph)
        await report_progress(job_id, 94, "Черновик извлечения сформирован")
        return draft
    except asyncio.CancelledError as exception:
        raise OperationCanceled() from exception
    finally:
        operations.finish(job_id)


async def run_extraction_pipeline(
    request: ExtractRequest,
    chunks: TextChunks,
    job_id: str,
) -> Neo4jGraph:
    embedded_chunks = await TextChunkEmbedder(
        embedder=embedder,
        max_concurrency=3,
    ).run(chunks)
    await report_progress(
        job_id,
        30,
        f"Векторные представления построены для {len(chunks.chunks)} фрагментов",
    )
    schema = await SchemaBuilder().run(**SCHEMA_INPUT)
    document_info = DocumentInfo(
        uid=request.documentId,
        path=request.title,
        metadata={
            "documentId": request.documentId,
            "title": request.title,
            "type": request.type,
        },
    )
    lexical_builder = LexicalGraphBuilder()
    lexical_result = await lexical_builder.run(
        text_chunks=embedded_chunks,
        document_info=document_info,
    )
    extractor = LLMEntityRelationExtractor(
        llm=extraction_llm,
        on_error=OnError.RAISE,
        use_structured_output=False,
        create_lexical_graph=False,
        max_concurrency=1,
    )
    semaphore = asyncio.Semaphore(1)
    tasks = [
        asyncio.create_task(
            extractor.run_for_chunk(
                semaphore,
                chunk,
                schema,
                "",
                lexical_builder,
            )
        )
        for chunk in embedded_chunks.chunks
    ]
    chunk_graphs: list[Neo4jGraph] = []
    total = len(tasks)
    completed_count = 0
    extraction_started_at = time.monotonic()

    async def heartbeat() -> None:
        while True:
            await asyncio.sleep(15)
            elapsed_minutes = max(1, round((time.monotonic() - extraction_started_at) / 60))
            progress = 35 + round(completed_count / total * 50)
            await report_progress(
                job_id,
                progress,
                (
                    f"LLM обрабатывает фрагменты: {completed_count} из {total}; "
                    f"прошло около {elapsed_minutes} мин."
                ),
            )

    await report_progress(
        job_id,
        35,
        f"LLM начала извлечение сущностей и связей из {total} фрагментов",
    )
    heartbeat_task = asyncio.create_task(heartbeat())
    try:
        for index, completed in enumerate(asyncio.as_completed(tasks), start=1):
            chunk_graphs.append(await completed)
            completed_count = index
            progress = 35 + round(index / total * 50)
            await report_progress(
                job_id,
                progress,
                f"LLM извлекла сущности и связи: {index} из {total} фрагментов",
            )
    finally:
        heartbeat_task.cancel()
        await asyncio.gather(heartbeat_task, return_exceptions=True)
        for task in tasks:
            if not task.done():
                task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)

    return extractor.combine_chunk_graphs(lexical_result.graph, chunk_graphs)


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
    nodes_by_id = {node.id: node for node in entity_nodes}
    for relation in graph.relationships:
        if relation.start_node_id not in id_mapping or relation.end_node_id not in id_mapping:
            continue
        source_node = nodes_by_id[relation.start_node_id]
        target_node = nodes_by_id[relation.end_node_id]
        relationship_type = validate_relationship(
            source_node.label,
            relation.type,
            target_node.label,
        )
        if relationship_type is None:
            warnings.append(
                "Связь отклонена схемой: "
                f"{source_node.label} --{relation.type}--> {target_node.label}."
            )
            continue
        if relationship_type != relation.type:
            warnings.append(
                f"Связь {relation.type} нормализована в {relationship_type}."
            )
        source_id = id_mapping[relation.start_node_id]
        target_id = id_mapping[relation.end_node_id]
        relation_id = stable_id(
            "relation",
            f"{request.documentId}:{source_id}:{relationship_type}:{target_id}",
        )
        source = entities_by_id.get(source_id, {}).get(
            "source",
            {"documentId": request.documentId, "page": 1},
        )
        relations_by_id[relation_id] = {
            "id": relation_id,
            "sourceId": source_id,
            "type": relationship_type,
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
