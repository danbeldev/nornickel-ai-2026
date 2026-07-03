import asyncio
import hashlib
import json
import re
import time
from typing import Any

from neo4j_graphrag.experimental.components.embedder import TextChunkEmbedder
from neo4j_graphrag.experimental.components.entity_relation_extractor import (
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
from .entity_extractor import NullSafeLLMEntityRelationExtractor
from .loaders import load_source_pages, split_source_pages
from .models import ExtractRequest
from .operations import OperationCanceled, operations, report_progress
from .resources import document_embedder, driver, extraction_llm
from .schema import ENTITY_TYPE_BY_LABEL, SCHEMA_INPUT, validate_relationship
from .synonyms import canonicalize
from .measurements import normalize_unit as normalize_measurement_unit


LEXICAL_LABELS = {"Document", "Chunk"}
DOCUMENT_SCOPED_TYPES = {
    "experiment",
    "conclusion",
    "data_issue",
    "unclassified",
}
REFERENCE_PLACEHOLDER = re.compile(
    r"(?iu)^(?:работа|исследование|статья|источник|reference|study|article)"
    r"\s*\[(?P<number>\d+)]$"
)
REFERENCE_MARKER = re.compile(r"(?iu)\[REFERENCE\s+(?P<number>\d+)]")
REFERENCE_SECTION_HINT = re.compile(
    r"(?iu)(список\s+использованных\s+источников|"
    r"список\s+литературы|references|bibliography)"
)
EXPERIMENT_MARKER = re.compile(
    r"(?iu)(эксперимент|испытан|тест|верификац|валидац|"
    r"сравнен|сопоставлен|расч[её]т|experiment|test|verification|validation)"
)
PUBLICATION_MENTION = re.compile(
    r"(?iu)^(исследование|работа|статья|анализ|построение\s+1d|"
    r"study|article|paper|analysis)\b"
)
SOFTWARE_NAMES = {
    "cae fidesys": "CAE Fidesys",
    "программный комплекс cae fidesys": "CAE Fidesys",
    "сапр autocad": "AutoCAD",
    "autocad": "AutoCAD",
}
METHOD_MARKER = re.compile(r"(?iu)^(метод|методика|технология|подход|method)")
GENERIC_GEOGRAPHY = re.compile(
    r"(?iu)^(сейсмоактивные районы|сейсмически активные районы|"
    r"seismically active regions?)$"
)
PROPERTY_LABELS = {
    "academic_degree": "Учёная степень",
    "aliases": "Синонимы",
    "application": "Применение",
    "authors": "Авторы",
    "category": "Категория",
    "citation_number": "Номер источника",
    "composition": "Состав",
    "conditions": "Условия",
    "context": "Контекст",
    "cooling_method": "Способ охлаждения",
    "country": "Страна",
    "date": "Дата",
    "description": "Описание",
    "doi": "DOI",
    "domain": "Предметная область",
    "duration": "Длительность",
    "email": "Email",
    "effect": "Эффект",
    "expertise": "Компетенция",
    "facility_type": "Тип объекта",
    "formula": "Формула",
    "issue_type": "Тип проблемы",
    "journal": "Журнал",
    "language": "Язык",
    "limitations": "Ограничения",
    "maturity": "Зрелость",
    "measurement": "Измерение",
    "model": "Модель",
    "operator": "Оператор",
    "orcid": "ORCID",
    "organization": "Организация",
    "output": "Результат процесса",
    "pages": "Страницы",
    "pressure": "Давление",
    "publication_type": "Тип публикации",
    "recommendation": "Рекомендация",
    "region": "Регион",
    "result": "Результат",
    "role": "Роль",
    "sample_size": "Размер выборки",
    "scope": "Область применения",
    "severity": "Важность",
    "setup": "Постановка",
    "statement": "Утверждение",
    "symbol": "Обозначение",
    "temperature": "Температура",
    "unit": "Единица измерения",
    "value": "Значение",
    "value_after": "Значение после",
    "value_before": "Значение до",
    "vendor": "Разработчик",
    "version": "Версия",
    "volume": "Том",
    "year": "Год",
}

NUMBER_WITH_UNIT = re.compile(
    r"(?P<operator><=|>=|≤|≥|<|>|=)?\s*"
    r"(?P<first>-?\d+(?:[.,]\d+)?)"
    r"(?:\s*(?:-|–|—|\.\.)\s*(?P<second>-?\d+(?:[.,]\d+)?))?"
    r"\s*(?P<unit>[^0-9]+)?$"
)
COMPOSITION_PERCENTAGE = re.compile(
    r"(?iu)(?P<value>-?\d+(?:[.,]\d+)?)\s*%\s*"
    r"(?P<component>[a-zа-яё][a-zа-яё0-9-]{0,30})"
)

async def embed_document(request: ExtractRequest) -> TextChunks:
    chunks = await load_document_chunks(request)
    return await TextChunkEmbedder(
        embedder=document_embedder,
        max_concurrency=1,
    ).run(chunks)


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
        embedder=document_embedder,
        max_concurrency=1,
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
    extractor = NullSafeLLMEntityRelationExtractor(
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

    warnings: list[str] = []
    entity_nodes = [
        node for node in graph.nodes if node.label not in LEXICAL_LABELS
    ]
    normalize_entity_nodes(
        entity_nodes,
        chunks,
        source_chunk_by_node,
        warnings,
    )
    entity_nodes = drop_non_entities(
        entity_nodes,
        chunks,
        source_chunk_by_node,
        warnings,
    )
    entity_nodes = resolve_current_publication_aliases(
        entity_nodes,
        graph.relationships,
        chunks,
        source_chunk_by_node,
        warnings,
    )
    entity_nodes = resolve_reference_placeholders(
        entity_nodes,
        graph.relationships,
        chunks,
        source_chunk_by_node,
        warnings,
    )
    id_mapping = resolve_entity_ids(request.documentId, entity_nodes)
    entities_by_id: dict[str, dict[str, Any]] = {}

    for node in entity_nodes:
        entity_type = ENTITY_TYPE_BY_LABEL.get(node.label, "unclassified")
        if entity_type == "unclassified" and node.label != "Unclassified":
            warnings.append(
                f"Тип сущности «{node.label}» преобразован в unclassified."
            )
        name = entity_name(node)
        source_chunk_id = source_chunk_by_node.get(node.id, "")
        chunk = chunks.get(source_chunk_id)
        entity_id = id_mapping[node.id]
        candidate = {
            "id": entity_id,
            "type": entity_type,
            "name": name,
            "attributes": [
                attribute
                for key, value in node.properties.items()
                if key not in {"name", "title"}
                for attribute in normalize_attributes(
                    humanize_property(key),
                    value,
                )
            ],
            "source": source_reference(request, chunk, name),
            "confidence": extraction_confidence(node, chunk, name),
            "verificationStatus": "EXTRACTED",
            "geography": first_property(
                node,
                "country",
                "region",
                "geography",
                "location",
            ),
            "year": integer_property(node, "year", "publication_year", "date"),
            "language": first_property(node, "language"),
        }
        if entity_id in entities_by_id:
            entities_by_id[entity_id] = merge_entity_records(
                entities_by_id[entity_id],
                candidate,
            )
        else:
            entities_by_id[entity_id] = candidate

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
        relation_chunk = chunks.get(
            source_chunk_by_node.get(relation.start_node_id, "")
        )
        source = source_reference(
            request,
            relation_chunk,
            f"{entity_name(source_node)} {entity_name(target_node)}",
        )
        relations_by_id[relation_id] = {
            "id": relation_id,
            "sourceId": source_id,
            "type": relationship_type,
            "targetId": target_id,
            "source": source,
        }

    publication_candidates = [
        entity
        for entity in entities_by_id.values()
        if entity["type"] == "publication"
        and not REFERENCE_SECTION_HINT.search(
            str((entity.get("source") or {}).get("section") or "")
        )
    ]
    existing_publication = (
        max(
            publication_candidates,
            key=lambda entity: fuzz.WRatio(
                normalize_name(entity["name"]),
                normalize_name(request.title),
            ),
        )
        if publication_candidates
        else None
    )
    if existing_publication and fuzz.WRatio(
        normalize_name(existing_publication["name"]),
        normalize_name(request.title),
    ) < 72:
        existing_publication = None
    publication_id = (
        existing_publication["id"]
        if existing_publication
        else stable_id("publication", request.documentId)
    )
    if existing_publication is None:
        entities_by_id[publication_id] = {
            "id": publication_id,
            "type": "publication",
            "name": request.title,
            "attributes": [
                normalize_attribute("Тип публикации", request.type),
            ],
            "source": {
                "documentId": request.documentId,
                "page": 1,
                "chunkId": None,
                "section": "Документ",
                "quote": request.title,
            },
            "confidence": 0.98,
            "verificationStatus": "EXTRACTED",
            "geography": None,
            "year": None,
            "language": None,
        }
    for entity in list(entities_by_id.values()):
        if entity["id"] == publication_id or entity["type"] not in {
            "experiment",
            "process",
            "technology",
            "conclusion",
        }:
            continue
        relation_id = stable_id(
            "relation",
            f"{request.documentId}:{entity['id']}:DESCRIBED_IN:{publication_id}",
        )
        relations_by_id.setdefault(
            relation_id,
            {
                "id": relation_id,
                "sourceId": entity["id"],
                "type": "DESCRIBED_IN",
                "targetId": publication_id,
                "source": entity["source"],
            },
        )

    for entity in list(entities_by_id.values()):
        geography = entity.get("geography")
        if not geography or entity["type"] not in {
            "experiment",
            "process",
            "technology",
            "team",
            "facility",
        }:
            continue
        geography_id = stable_id("geography", normalize_name(str(geography)))
        entities_by_id.setdefault(
            geography_id,
            {
                "id": geography_id,
                "type": "geography",
                "name": str(geography),
                "attributes": [
                    normalize_attribute("Страна или регион", geography),
                ],
                "source": entity["source"],
                "confidence": entity.get("confidence", 0.7),
                "verificationStatus": "EXTRACTED",
                "geography": str(geography),
                "year": None,
                "language": entity.get("language"),
            },
        )
        relation_id = stable_id(
            "relation",
            f"{request.documentId}:{entity['id']}:LOCATED_IN:{geography_id}",
        )
        relations_by_id.setdefault(
            relation_id,
            {
                "id": relation_id,
                "sourceId": entity["id"],
                "type": "LOCATED_IN",
                "targetId": geography_id,
                "source": entity["source"],
            },
        )

    if not entities_by_id:
        warnings.append("KG Builder не извлек сущности из документа.")

    return {
        "documentId": request.documentId,
        "entities": list(entities_by_id.values()),
        "relations": list(relations_by_id.values()),
        "warnings": warnings,
    }


def source_reference(
    request: ExtractRequest,
    chunk: Neo4jNode | None,
    entity_name_value: str,
) -> dict[str, Any]:
    properties = chunk.properties if chunk else {}
    text = str(properties.get("text") or "")
    return {
        "documentId": request.documentId,
        "page": int(properties.get("page", 1)),
        "chunkId": chunk.id if chunk else None,
        "section": str(properties.get("section") or "Документ"),
        "quote": best_source_quote(text, entity_name_value),
    }


def best_source_quote(text: str, entity_name_value: str) -> str | None:
    sentences = [
        item.strip()
        for item in re.split(r"(?<=[.!?])\s+|\n+", text)
        if item.strip()
    ]
    if not sentences:
        return None
    normalized_name = normalize_name(entity_name_value)
    ranked = max(
        sentences,
        key=lambda sentence: fuzz.partial_ratio(
            normalized_name,
            normalize_name(sentence),
        ),
    )
    score = fuzz.partial_ratio(normalized_name, normalize_name(ranked))
    if entity_name_value and score < 35:
        return None
    return ranked if len(ranked) <= 420 else ranked[:417].rstrip() + "..."


def normalize_entity_nodes(
    nodes: list[Neo4jNode],
    chunks: dict[str, Neo4jNode],
    source_chunk_by_node: dict[str, str],
    warnings: list[str],
) -> None:
    for node in nodes:
        original_label = node.label
        name = entity_name(node)
        normalized = normalize_name(name)
        chunk = chunks.get(source_chunk_by_node.get(node.id, ""))
        section = str((chunk.properties if chunk else {}).get("section") or "")

        if original_label == "Software" or normalized in SOFTWARE_NAMES:
            node.label = "Equipment"
            node.properties["name"] = SOFTWARE_NAMES.get(normalized, name)
        elif original_label == "Facility" and re.fullmatch(
            r"(?iu)рудник(?:\s+с\b.*)?",
            name.strip(),
        ):
            node.properties["name"] = "рудник"
        elif original_label == "Experiment" and not is_real_experiment(node, name):
            node.label = (
                "Publication"
                if REFERENCE_SECTION_HINT.search(section)
                or PUBLICATION_MENTION.search(name)
                else "Process"
            )
        elif original_label == "Process" and METHOD_MARKER.search(name):
            node.label = "Technology"
        elif (
            original_label == "Technology"
            and not METHOD_MARKER.search(name)
            and re.search(r"(?iu)(моделирован|расч[её]т|формирован|modeling)", name)
        ):
            node.label = "Process"

        if node.label != original_label:
            warnings.append(
                f"Тип сущности «{name}» нормализован: "
                f"{original_label} → {node.label}."
            )


def is_real_experiment(node: Neo4jNode, name: str) -> bool:
    has_result = any(
        node.properties.get(key) not in (None, "")
        for key in (
            "result",
            "results",
            "outcome",
            "measurement",
            "value_after",
        )
    )
    return has_result or bool(EXPERIMENT_MARKER.search(name))


def drop_non_entities(
    nodes: list[Neo4jNode],
    chunks: dict[str, Neo4jNode],
    source_chunk_by_node: dict[str, str],
    warnings: list[str],
) -> list[Neo4jNode]:
    result: list[Neo4jNode] = []
    for node in nodes:
        chunk = chunks.get(source_chunk_by_node.get(node.id, ""))
        section = str((chunk.properties if chunk else {}).get("section") or "")
        if node.label == "Geography" and GENERIC_GEOGRAPHY.fullmatch(
            entity_name(node).strip()
        ):
            warnings.append(
                f"Область применения «{entity_name(node)}» не создана как Geography."
            )
            continue
        if node.label == "Expert" and REFERENCE_SECTION_HINT.search(section):
            warnings.append(
                f"Автор библиографической записи «{entity_name(node)}» "
                "сохранён как атрибут Publication, без отдельной Expert-сущности."
            )
            continue
        result.append(node)
    return result


def resolve_current_publication_aliases(
    nodes: list[Neo4jNode],
    relationships: list[Any],
    chunks: dict[str, Neo4jNode],
    source_chunk_by_node: dict[str, str],
    warnings: list[str],
) -> list[Neo4jNode]:
    def section_for(node: Neo4jNode) -> str:
        chunk = chunks.get(source_chunk_by_node.get(node.id, ""))
        return str((chunk.properties if chunk else {}).get("section") or "")

    candidates = [
        node
        for node in nodes
        if node.label == "Publication"
        and not REFERENCE_SECTION_HINT.search(section_for(node))
    ]
    primary = next(
        (
            node
            for node in candidates
            if first_property(node, "authors", "author")
        ),
        None,
    )
    if primary is None:
        return nodes

    aliases = [
        node
        for node in candidates
        if node.id != primary.id
        and re.match(r"(?iu)^(статья|article|paper)\b", entity_name(node))
        and not first_property(node, "year", "citation_number")
    ]
    if not aliases:
        return nodes

    replacements = {node.id: primary.id for node in aliases}
    alias_ids = set(replacements)
    for relation in relationships:
        if relation.start_node_id in replacements:
            relation.start_node_id = replacements[relation.start_node_id]
        if relation.end_node_id in replacements:
            relation.end_node_id = replacements[relation.end_node_id]
    warnings.extend(
        f"Публикация «{entity_name(node)}» объединена с текущим документом."
        for node in aliases
    )
    return [node for node in nodes if node.id not in alias_ids]


def resolve_reference_placeholders(
    nodes: list[Neo4jNode],
    relationships: list[Any],
    chunks: dict[str, Neo4jNode],
    source_chunk_by_node: dict[str, str],
    warnings: list[str],
) -> list[Neo4jNode]:
    references: dict[str, Neo4jNode] = {}
    placeholders: list[tuple[Neo4jNode, str]] = []

    for node in nodes:
        if node.label != "Publication":
            continue
        name = entity_name(node)
        placeholder = REFERENCE_PLACEHOLDER.fullmatch(name.strip())
        chunk = chunks.get(source_chunk_by_node.get(node.id, ""))
        number = citation_number(node, chunk)
        if placeholder:
            placeholders.append((node, placeholder.group("number")))
        elif number:
            references[number] = node

    replacements: dict[str, str] = {}
    removed: set[str] = set()
    for placeholder, number in placeholders:
        target = references.get(number)
        removed.add(placeholder.id)
        if target:
            replacements[placeholder.id] = target.id
            warnings.append(
                f"Ссылка [{number}] объединена с полной библиографической записью."
            )
        else:
            warnings.append(
                f"Плейсхолдер ссылки [{number}] удалён: полная запись не найдена."
            )

    for relation in relationships:
        if relation.start_node_id in replacements:
            relation.start_node_id = replacements[relation.start_node_id]
        if relation.end_node_id in replacements:
            relation.end_node_id = replacements[relation.end_node_id]

    relationships[:] = [
        relation
        for relation in relationships
        if relation.start_node_id not in removed
        and relation.end_node_id not in removed
    ]
    return [node for node in nodes if node.id not in removed]


def citation_number(
    node: Neo4jNode,
    chunk: Neo4jNode | None,
) -> str | None:
    direct = first_property(node, "citation_number", "reference_number")
    if direct:
        match = re.search(r"\d+", direct)
        if match:
            return match.group()
    text = str((chunk.properties if chunk else {}).get("text") or "")
    markers = list(REFERENCE_MARKER.finditer(text))
    if not markers:
        return None
    name = normalize_name(entity_name(node))
    ranked: list[tuple[float, str]] = []
    for index, marker in enumerate(markers):
        end = markers[index + 1].start() if index + 1 < len(markers) else len(text)
        reference_text = normalize_name(text[marker.end():end])
        ranked.append(
            (
                fuzz.partial_ratio(name, reference_text),
                marker.group("number"),
            )
        )
    return max(ranked, key=lambda item: item[0])[1]


def merge_entity_records(
    existing: dict[str, Any],
    candidate: dict[str, Any],
) -> dict[str, Any]:
    merged = dict(existing)
    seen_attributes = {
        (attribute["name"], str(attribute["value"]))
        for attribute in existing["attributes"]
    }
    merged["attributes"] = [
        *existing["attributes"],
        *[
            attribute
            for attribute in candidate["attributes"]
            if (attribute["name"], str(attribute["value"]))
            not in seen_attributes
        ],
    ]
    if candidate["confidence"] > existing["confidence"]:
        merged["confidence"] = candidate["confidence"]
        merged["source"] = candidate["source"]
        merged["name"] = candidate["name"]
    for field in ("geography", "year", "language"):
        if merged.get(field) is None and candidate.get(field) is not None:
            merged[field] = candidate[field]
    return merged


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
    return canonicalize(value)


def stable_id(prefix: str, value: str) -> str:
    digest = hashlib.sha1(value.encode("utf-8")).hexdigest()[:18]
    return f"{prefix}-{digest}"


def humanize_property(value: str) -> str:
    normalized = value.strip().lower()
    return PROPERTY_LABELS.get(
        normalized,
        normalized.replace("_", " ").capitalize(),
    )


def json_value(value: Any) -> str | int | float | bool:
    if isinstance(value, (str, int, float, bool)):
        return value
    return json.dumps(value, ensure_ascii=False, default=str)


def normalize_attribute(name: str, value: Any) -> dict[str, Any]:
    serialized = json_value(value)
    result = {
        "name": name,
        "value": serialized,
        "unit": None,
        "operator": None,
        "numericValue": None,
        "minValue": None,
        "maxValue": None,
        "normalizedUnit": None,
    }
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        result["numericValue"] = float(value)
        result["operator"] = "="
        return result
    if not isinstance(serialized, str):
        return result

    match = NUMBER_WITH_UNIT.search(serialized.strip())
    if not match:
        return result
    first = float(match.group("first").replace(",", "."))
    second_raw = match.group("second")
    unit = (match.group("unit") or "").strip(" .;,")
    operator = normalize_operator(match.group("operator"))
    normalized_unit, factor = normalize_measurement_unit(unit)
    result["unit"] = unit or None
    result["normalizedUnit"] = normalized_unit
    if second_raw is not None:
        second = float(second_raw.replace(",", "."))
        result["minValue"] = min(first, second) * factor
        result["maxValue"] = max(first, second) * factor
        result["operator"] = "BETWEEN"
    else:
        result["numericValue"] = first * factor
        result["operator"] = operator or "="
    return result


def normalize_attributes(name: str, value: Any) -> list[dict[str, Any]]:
    base = normalize_attribute(name, value)
    if not isinstance(value, str):
        return [base]
    components = [
        {
            "name": f"Содержание {match.group('component')}",
            "value": match.group("value"),
            "unit": "%",
            "operator": "=",
            "numericValue": float(match.group("value").replace(",", ".")),
            "minValue": None,
            "maxValue": None,
            "normalizedUnit": "%",
        }
        for match in COMPOSITION_PERCENTAGE.finditer(value)
    ]
    return [base, *components] if components else [base]


def normalize_operator(value: str | None) -> str | None:
    return {
        "≤": "<=",
        "≥": ">=",
    }.get(value or "", value)


def first_property(node: Neo4jNode, *names: str) -> str | None:
    for name in names:
        value = node.properties.get(name)
        if value is not None and str(value).strip():
            return str(value).strip()
    return None


def integer_property(node: Neo4jNode, *names: str) -> int | None:
    value = first_property(node, *names)
    if value is None:
        return None
    match = re.search(r"\b(?:19|20)\d{2}\b", value)
    return int(match.group()) if match else None


def extraction_confidence(
    node: Neo4jNode,
    chunk: Neo4jNode | None,
    name: str,
) -> float:
    meaningful = [
        value
        for key, value in node.properties.items()
        if key not in {"name", "title"} and value not in (None, "")
    ]
    text = str((chunk.properties if chunk else {}).get("text") or "")
    section = str((chunk.properties if chunk else {}).get("section") or "")
    normalized_text = normalize_name(text)
    normalized_name = normalize_name(name)
    evidence_score = fuzz.partial_ratio(normalized_name, normalized_text)

    confidence = 0.48
    if normalized_name and normalized_name in normalized_text:
        confidence += 0.28
    elif evidence_score >= 80:
        confidence += 0.18
    elif evidence_score >= 60:
        confidence += 0.1
    confidence += min(0.09, len(meaningful) * 0.03)
    if node.label == "Publication" and REFERENCE_SECTION_HINT.search(section):
        confidence += 0.08
    if node.label == "Unclassified":
        confidence -= 0.12
    if REFERENCE_PLACEHOLDER.fullmatch(name.strip()):
        confidence -= 0.2
    return round(max(0.35, min(0.96, confidence)), 2)
