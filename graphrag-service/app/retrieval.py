import logging
import re
from typing import Any

from neo4j import Record
from neo4j_graphrag.retrievers import HybridCypherRetriever
from neo4j_graphrag.types import RetrieverResultItem

from .config import settings
from .models import EntityMention, RetrieveRequest
from .publication import CHUNK_FULLTEXT_INDEX_NAME, VECTOR_INDEX_NAME
from .resources import driver, embedder
from .schema import LABEL_BY_ENTITY_TYPE, validate_relationship


logger = logging.getLogger(__name__)

CONVERSATIONAL_QUERIES = {
    "hello",
    "hi",
    "hey",
    "thanks",
    "thank you",
    "здравствуй",
    "здравствуйте",
    "привет",
    "приветствую",
    "спасибо",
}

RETRIEVAL_QUERY = """
WITH node, score
OPTIONAL MATCH (node)-[:FROM_DOCUMENT]->(document:Document)
OPTIONAL MATCH (entity:__Entity__)-[:MENTIONED_IN]->(node)
OPTIONAL MATCH (entity)-[relation]-(neighbor:__Entity__)
RETURN node.id AS chunkId,
       node.text AS text,
       node.page AS page,
       node.section AS section,
       document.id AS documentId,
       document.title AS documentTitle,
       score,
       [item IN collect(DISTINCT entity.id) WHERE item IS NOT NULL] AS entityIds,
       [item IN collect(DISTINCT {
           sourceId: startNode(relation).id,
           relationship: type(relation),
           targetId: endNode(relation).id
       }) WHERE item.sourceId IS NOT NULL AND item.targetId IS NOT NULL] AS graphPaths
"""


def retrieve(request: RetrieveRequest) -> dict[str, Any]:
    query = remove_mention_markers(request.query, request.mentions)
    if not request.mentions and is_conversational_query(query):
        return empty_retrieval_response()
    try:
        implicit_mentions = detect_implicit_mentions(query)
    except Exception as exception:
        logger.info("Implicit entity detection is unavailable: %s", exception)
        implicit_mentions = []
    anchors = merge_mentions(request.mentions, implicit_mentions)
    contexts: dict[str, dict[str, Any]] = {}

    try:
        retriever = HybridCypherRetriever(
            driver=driver,
            vector_index_name=VECTOR_INDEX_NAME,
            fulltext_index_name=CHUNK_FULLTEXT_INDEX_NAME,
            embedder=embedder,
            retrieval_query=RETRIEVAL_QUERY,
            result_formatter=format_record,
            neo4j_database=settings.neo4j_database,
        )
        result = retriever.search(
            query_text=query,
            top_k=settings.retrieval_top_k,
            effective_search_ratio=3,
        )
        for item in result.items:
            add_context(contexts, item.content, source="hybrid")
    except Exception as exception:
        # The graph can legitimately have no indexes before the first publication.
        logger.info("Hybrid retrieval is not ready: %s", exception)

    for context in retrieve_from_mentions(anchors, request.graphDepth):
        add_context(contexts, context, source="mention")

    ranked_contexts = sorted(
        contexts.values(),
        key=lambda item: (
            1 if item["source"] == "mention" else 0,
            float(item.get("score") or 0),
        ),
        reverse=True,
    )[: settings.retrieval_top_k]

    graph_paths = unique_graph_paths(ranked_contexts)
    entity_ids = sorted(
        {
            entity_id
            for context in ranked_contexts
            for entity_id in context.get("entityIds", [])
        }
        | {mention.id for mention in anchors}
        | {
            entity_id
            for path in graph_paths
            for entity_id in (path["sourceId"], path["targetId"])
        }
    )
    matched_entities = load_entities(entity_ids)
    citations = build_citations(ranked_contexts)
    graph_paths = enrich_graph_paths(graph_paths, matched_entities)
    matched_entities = rank_entities(
        matched_entities,
        anchors,
        graph_paths,
    )
    graph_paths = rank_paths(graph_paths, matched_entities)

    return {
        "retrievalStatus": "available",
        "answerHint": (
            f"Найдено фрагментов: {len(ranked_contexts)}; "
            f"связанных сущностей: {len(matched_entities)}."
            if ranked_contexts
            else "В опубликованной базе знаний не найден релевантный контекст."
        ),
        "citations": citations,
        "sourcesFound": len(citations),
        "experimentsFound": sum(
            1 for entity in matched_entities if entity["type"] == "experiment"
        ),
        "contextChunks": [
            format_context_for_prompt(context) for context in ranked_contexts
        ],
        "contexts": ranked_contexts,
        "matchedEntities": matched_entities,
        "graphPaths": graph_paths,
    }


def detect_implicit_mentions(query: str) -> list[EntityMention]:
    normalized_query = f" {normalize_text(query)} "
    if not normalized_query.strip():
        return []
    records, _, _ = driver.execute_query(
        """
        MATCH (entity:__Entity__)
        WITH entity,
             coalesce(entity.normalizedName, toLower(entity.name)) AS normalized_name
        WHERE size(normalized_name) >= 3
          AND $normalized_query CONTAINS ' ' + normalized_name + ' '
        RETURN entity.id AS id,
               entity.entityType AS type,
               entity.name AS label,
               normalized_name AS normalizedName
        LIMIT 12
        """,
        parameters_={"normalized_query": normalized_query},
        database_=settings.neo4j_database,
    )
    candidates = [
        (
            normalized_query.find(f" {record['normalizedName']} "),
            -len(str(record["normalizedName"])),
            EntityMention(
                id=str(record["id"]),
                type=str(record["type"]),
                label=str(record["label"]),
            ),
        )
        for record in records
        if record["id"] and record["type"] and record["label"]
    ]
    candidates.sort(key=lambda item: (item[0], item[1]))
    return [item[2] for item in candidates]


def merge_mentions(
    explicit: list[EntityMention],
    implicit: list[EntityMention],
) -> list[EntityMention]:
    result: list[EntityMention] = []
    seen: set[str] = set()
    for mention in [*explicit, *implicit]:
        if mention.id in seen:
            continue
        seen.add(mention.id)
        result.append(mention)
    return result


def rank_entities(
    entities: list[dict[str, Any]],
    anchors: list[EntityMention],
    paths: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    anchor_order = {mention.id: index for index, mention in enumerate(anchors)}
    distances = graph_distances(set(anchor_order), paths)
    type_priority = {
        "experiment": 0,
        "regime": 1,
        "property": 2,
        "material": 3,
        "conclusion": 4,
        "data_issue": 5,
        "equipment": 6,
        "team": 7,
        "document": 8,
        "unclassified": 9,
    }
    return sorted(
        entities,
        key=lambda entity: (
            0 if entity["id"] in anchor_order else 1,
            anchor_order.get(entity["id"], 10_000),
            distances.get(entity["id"], 10_000),
            type_priority.get(str(entity.get("type")), 10_000),
            str(entity.get("label", "")).lower(),
        ),
    )


def graph_distances(
    anchor_ids: set[str],
    paths: list[dict[str, Any]],
) -> dict[str, int]:
    distances = {entity_id: 0 for entity_id in anchor_ids}
    adjacency: dict[str, set[str]] = {}
    for path in paths:
        source_id = str(path.get("sourceId") or "")
        target_id = str(path.get("targetId") or "")
        if not source_id or not target_id:
            continue
        adjacency.setdefault(source_id, set()).add(target_id)
        adjacency.setdefault(target_id, set()).add(source_id)

    frontier = list(anchor_ids)
    while frontier:
        entity_id = frontier.pop(0)
        for neighbor_id in adjacency.get(entity_id, set()):
            if neighbor_id in distances:
                continue
            distances[neighbor_id] = distances[entity_id] + 1
            frontier.append(neighbor_id)
    return distances


def rank_paths(
    paths: list[dict[str, Any]],
    entities: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    entity_order = {
        entity["id"]: index for index, entity in enumerate(entities)
    }
    return sorted(
        paths,
        key=lambda path: (
            min(
                entity_order.get(path["sourceId"], 10_000),
                entity_order.get(path["targetId"], 10_000),
            ),
            max(
                entity_order.get(path["sourceId"], 10_000),
                entity_order.get(path["targetId"], 10_000),
            ),
            str(path.get("relationship", "")),
        ),
    )


def enrich_graph_paths(
    paths: list[dict[str, Any]],
    entities: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    entities_by_id = {entity["id"]: entity for entity in entities}
    result: list[dict[str, Any]] = []
    for path in paths:
        source = entities_by_id.get(path["sourceId"], {})
        target = entities_by_id.get(path["targetId"], {})
        relationship = str(path.get("relationship") or "")
        if relationship == "SELECTED":
            validated_relationship = relationship
        else:
            source_label = LABEL_BY_ENTITY_TYPE.get(
                str(source.get("type", "unclassified")),
                "Unclassified",
            )
            target_label = LABEL_BY_ENTITY_TYPE.get(
                str(target.get("type", "unclassified")),
                "Unclassified",
            )
            validated_relationship = validate_relationship(
                source_label,
                relationship,
                target_label,
            )
        if validated_relationship is None:
            continue
        result.append({
            **path,
            "relationship": validated_relationship,
            "sourceLabel": source.get("label", path["sourceId"]),
            "sourceType": source.get("type", "unclassified"),
            "targetLabel": target.get("label", path["targetId"]),
            "targetType": target.get("type", "unclassified"),
        })
    return result


def normalize_text(value: str) -> str:
    return re.sub(r"[^a-zа-яё0-9]+", " ", value.lower()).strip()


def format_record(record: Record) -> RetrieverResultItem:
    return RetrieverResultItem(
        content=dict(record),
        metadata={"score": record.get("score")},
    )


def retrieve_from_mentions(
    mentions: list[EntityMention],
    graph_depth: int,
) -> list[dict[str, Any]]:
    if not mentions:
        return []
    entity_ids = [
        mention.id for mention in mentions if mention.type != "document"
    ]
    document_ids = [
        mention.id for mention in mentions if mention.type == "document"
    ]
    contexts = retrieve_from_entity_mentions(entity_ids, graph_depth)
    contexts.extend(retrieve_from_document_mentions(document_ids))
    return contexts


def retrieve_from_entity_mentions(
    entity_ids: list[str],
    graph_depth: int,
) -> list[dict[str, Any]]:
    if not entity_ids:
        return []
    safe_depth = max(1, min(graph_depth, 2))
    cypher = """
        UNWIND $entity_ids AS entity_id
        MATCH (anchor:__Entity__ {id: entity_id})
        OPTIONAL MATCH path = (anchor)-[*0..__GRAPH_DEPTH__]-(related:__Entity__)
        WITH anchor,
             coalesce(related, anchor) AS entity,
             relationships(path) AS path_relations
        MATCH (entity)-[:MENTIONED_IN]->(chunk:Chunk)-[:FROM_DOCUMENT]->(document:Document)
        UNWIND CASE
            WHEN size(path_relations) = 0 THEN [null]
            ELSE path_relations
        END AS path_relation
        RETURN chunk.id AS chunkId,
               chunk.text AS text,
               chunk.page AS page,
               chunk.section AS section,
               chunk.index AS chunkIndex,
               document.id AS documentId,
               document.title AS documentTitle,
               1.0 AS score,
               collect(DISTINCT entity.id) AS entityIds,
               collect(DISTINCT CASE
                   WHEN path_relation IS NULL THEN {
                       sourceId: anchor.id,
                       relationship: 'SELECTED',
                       targetId: anchor.id
                   }
                   ELSE {
                       sourceId: startNode(path_relation).id,
                       relationship: type(path_relation),
                       targetId: endNode(path_relation).id
                   }
               END) AS graphPaths
        ORDER BY chunkIndex
        LIMIT $limit
        """.replace("__GRAPH_DEPTH__", str(safe_depth))
    records, _, _ = driver.execute_query(
        cypher,
        parameters_={
            "entity_ids": entity_ids,
            "limit": settings.retrieval_top_k,
        },
        database_=settings.neo4j_database,
    )
    return [dict(record) for record in records]


def retrieve_from_document_mentions(
    document_ids: list[str],
) -> list[dict[str, Any]]:
    if not document_ids:
        return []
    records, _, _ = driver.execute_query(
        """
        UNWIND $document_ids AS document_id
        MATCH (chunk:Chunk)-[:FROM_DOCUMENT]->(document:Document {id: document_id})
        OPTIONAL MATCH (entity:__Entity__)-[:MENTIONED_IN]->(chunk)
        OPTIONAL MATCH (entity)-[relation]-(neighbor:__Entity__)
        RETURN chunk.id AS chunkId,
               chunk.text AS text,
               chunk.page AS page,
               chunk.section AS section,
               chunk.index AS chunkIndex,
               document.id AS documentId,
               document.title AS documentTitle,
               1.0 AS score,
               [item IN collect(DISTINCT entity.id) WHERE item IS NOT NULL] AS entityIds,
               [item IN collect(DISTINCT {
                   sourceId: startNode(relation).id,
                   relationship: type(relation),
                   targetId: endNode(relation).id
               }) WHERE item.sourceId IS NOT NULL AND item.targetId IS NOT NULL] AS graphPaths
        ORDER BY chunkIndex
        LIMIT $limit
        """,
        parameters_={
            "document_ids": document_ids,
            "limit": settings.retrieval_top_k,
        },
        database_=settings.neo4j_database,
    )
    return [dict(record) for record in records]


def add_context(
    contexts: dict[str, dict[str, Any]],
    raw: Any,
    source: str,
) -> None:
    if not isinstance(raw, dict) or not raw.get("chunkId"):
        return
    context = {
        "chunkId": str(raw["chunkId"]),
        "text": str(raw.get("text") or ""),
        "documentId": str(raw.get("documentId") or ""),
        "documentTitle": str(raw.get("documentTitle") or raw.get("documentId") or ""),
        "page": int(raw.get("page") or 1),
        "section": str(raw.get("section") or ""),
        "score": float(raw.get("score") or 0),
        "entityIds": list(raw.get("entityIds") or []),
        "graphPaths": list(raw.get("graphPaths") or []),
        "source": source,
    }
    existing = contexts.get(context["chunkId"])
    if existing:
        existing["score"] = max(existing["score"], context["score"])
        existing["entityIds"] = sorted(
            set(existing["entityIds"]) | set(context["entityIds"])
        )
        existing["graphPaths"] = unique_dicts(
            existing["graphPaths"] + context["graphPaths"]
        )
        if source == "mention":
            existing["source"] = "mention"
    else:
        contexts[context["chunkId"]] = context


def load_entities(entity_ids: list[str]) -> list[dict[str, Any]]:
    if not entity_ids:
        return []
    records, _, _ = driver.execute_query(
        """
        UNWIND $entity_ids AS entity_id
        MATCH (entity:__Entity__ {id: entity_id})
        RETURN entity.id AS id,
               entity.entityType AS type,
               entity.name AS label,
               entity.description AS description
        UNION
        UNWIND $entity_ids AS entity_id
        MATCH (document:Document {id: entity_id})
        RETURN document.id AS id,
               'document' AS type,
               document.title AS label,
               'Исходный документ базы знаний' AS description
        """,
        parameters_={"entity_ids": entity_ids},
        database_=settings.neo4j_database,
    )
    return [dict(record) for record in records]


def build_citations(contexts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    citations: list[dict[str, Any]] = []
    seen: set[tuple[str, int]] = set()
    for context in contexts:
        key = (context["documentId"], context["page"])
        if not context["documentId"] or key in seen:
            continue
        seen.add(key)
        citations.append(
            {
                "id": f"citation-{context['documentId']}-{context['page']}",
                "entityId": context["documentId"],
                "entityType": "document",
                "label": context["documentTitle"],
                "description": (
                    f"Фрагмент документа"
                    + (
                        f", раздел «{context['section']}»"
                        if context["section"]
                        else ""
                    )
                ),
                "page": context["page"],
            }
        )
    return citations


def unique_graph_paths(contexts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return unique_dicts(
        [
            path
            for context in contexts
            for path in context.get("graphPaths", [])
            if path.get("sourceId") and path.get("targetId")
        ]
    )


def unique_dicts(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    unique: dict[tuple[Any, ...], dict[str, Any]] = {}
    for item in items:
        key = tuple(sorted(item.items()))
        unique[key] = item
    return list(unique.values())


def format_context_for_prompt(context: dict[str, Any]) -> str:
    return (
        f"Документ: {context['documentTitle']}; страница: {context['page']}; "
        f"релевантность: {context['score']:.3f}\n{context['text']}"
    )


def remove_mention_markers(
    query: str,
    mentions: list[EntityMention],
) -> str:
    normalized = query
    for mention in mentions:
        normalized = normalized.replace("@" + mention.label, mention.label)
    return normalized


def is_conversational_query(query: str) -> bool:
    normalized = query.lower().strip(" \t\r\n!,.?–—")
    return normalized in CONVERSATIONAL_QUERIES


def empty_retrieval_response() -> dict[str, Any]:
    return {
        "retrievalStatus": "available",
        "answerHint": "Сообщение не требует поиска во внутренней базе знаний.",
        "citations": [],
        "sourcesFound": 0,
        "experimentsFound": 0,
        "contextChunks": [],
        "contexts": [],
        "matchedEntities": [],
        "graphPaths": [],
    }
