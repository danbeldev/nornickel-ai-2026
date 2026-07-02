import logging
import re
from typing import Any

from neo4j import Record
from neo4j_graphrag.retrievers import HybridCypherRetriever
from neo4j_graphrag.types import RetrieverResultItem

from .config import settings
from .models import EntityMention, QueryFilters, RetrieveRequest
from .publication import CHUNK_FULLTEXT_INDEX_NAME, VECTOR_INDEX_NAME
from .resources import driver, embedder
from .schema import LABEL_BY_ENTITY_TYPE, validate_relationship
from .synonyms import expand_query
from .measurements import normalize_unit as normalize_measurement_unit


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

KNOWLEDGE_RELATIONSHIPS = [
    "USES_MATERIAL",
    "USES_REGIME",
    "AFFECTS",
    "MEASURES",
    "USES_EQUIPMENT",
    "PERFORMED_BY",
    "PRODUCES_CONCLUSION",
    "BASED_ON",
    "RELATED_TO",
    "COMPARED_WITH",
    "USES",
    "USES_PROCESS",
    "DESCRIBED_IN",
    "DESCRIBES",
    "AUTHORED_BY",
    "EXPERT_IN",
    "AFFILIATED_WITH",
    "LOCATED_IN",
    "IMPLEMENTED_AT",
    "APPLIES_TO",
    "PRODUCES_OUTPUT",
    "VALIDATED_BY",
    "HAS_ECONOMIC_INDICATOR",
    "CONTRADICTS",
]

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
    expanded_query = expand_query(query)
    try:
        implicit_mentions = detect_implicit_mentions(expanded_query)
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
            query_text=expanded_query,
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

    filtered_contexts = list(contexts.values())
    allowed_entity_ids = load_filtered_entity_ids(request.filters)
    if allowed_entity_ids is not None:
        filtered_contexts = retrieve_filtered_entity_contexts(
            allowed_entity_ids,
            include_source_text=not bool(request.filters.numericConditions),
        )

    result_limit = (
        settings.filtered_retrieval_top_k
        if allowed_entity_ids is not None
        else settings.retrieval_top_k
    )
    ranked_contexts = sorted(
        filtered_contexts,
        key=lambda item: (
            1 if item["source"] == "mention" else 0,
            float(item.get("score") or 0),
        ),
        reverse=True,
    )[:result_limit]

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
    recommendations = load_recommendations(entity_ids)

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
        "recommendations": recommendations,
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
        "process": 6,
        "technology": 7,
        "publication": 8,
        "expert": 9,
        "facility": 10,
        "geography": 11,
        "economic_indicator": 12,
        "equipment": 13,
        "team": 14,
        "document": 15,
        "unclassified": 16,
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
    safe_depth = max(1, min(graph_depth, 4))
    cypher = """
        UNWIND $entity_ids AS entity_id
        MATCH (anchor:__Entity__ {id: entity_id})
        OPTIONAL MATCH path = (anchor)-[*0..__GRAPH_DEPTH__]-(related:__Entity__)
        WHERE all(relation IN relationships(path)
                  WHERE type(relation) IN $knowledge_relationships)
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
            "knowledge_relationships": KNOWLEDGE_RELATIONSHIPS,
        },
        database_=settings.neo4j_database,
    )
    return [dict(record) for record in records]


def context_entity_ids(context: dict[str, Any]) -> set[str]:
    result = {
        str(entity_id)
        for entity_id in context.get("entityIds", [])
        if entity_id
    }
    for path in context.get("graphPaths", []):
        if path.get("sourceId"):
            result.add(str(path["sourceId"]))
        if path.get("targetId"):
            result.add(str(path["targetId"]))
    return result


def load_filtered_entity_ids(filters: QueryFilters | None) -> set[str] | None:
    if filters is None:
        return None
    active = bool(
        filters.entityTypes
        or filters.countries
        or filters.geographyScope in {"domestic", "foreign"}
        or filters.yearFrom is not None
        or filters.yearTo is not None
        or filters.numericConditions
    )
    if not active:
        return None

    numeric_conditions = [
        normalize_numeric_condition(condition)
        for condition in filters.numericConditions
    ]
    records, _, _ = driver.execute_query(
        """
        MATCH (entity:__Entity__)
        WHERE (size($entity_types) = 0 OR entity.entityType IN $entity_types)
          AND (
              $year_from IS NULL
              OR entity.publicationYear >= $year_from
              OR EXISTS {
                  MATCH (entity)-[:DESCRIBED_IN|DESCRIBES]-(publication:Publication)
                  WHERE publication.publicationYear >= $year_from
              }
          )
          AND (
              $year_to IS NULL
              OR entity.publicationYear <= $year_to
              OR EXISTS {
                  MATCH (entity)-[:DESCRIBED_IN|DESCRIBES]-(publication:Publication)
                  WHERE publication.publicationYear <= $year_to
              }
          )
          AND (
              size($countries) = 0
              OR any(country IN $countries WHERE
                  toLower(coalesce(entity.geography, '')) CONTAINS toLower(country)
                  OR EXISTS {
                      MATCH (entity)-[:LOCATED_IN]-(geo:Geography)
                      WHERE toLower(coalesce(geo.name, '')) CONTAINS toLower(country)
                         OR toLower(coalesce(geo.country, '')) CONTAINS toLower(country)
                  }
              )
          )
          AND (
              $geography_scope IS NULL
              OR ($geography_scope = 'domestic' AND (
                  toLower(coalesce(entity.geography, '')) CONTAINS 'росси'
                  OR EXISTS {
                      MATCH (entity)-[:LOCATED_IN]-(domestic:Geography)
                      WHERE toLower(coalesce(domestic.name, '')) CONTAINS 'росси'
                         OR toLower(coalesce(domestic.country, '')) CONTAINS 'росси'
                  }
              ))
              OR ($geography_scope = 'foreign' AND
                  NOT (toLower(coalesce(entity.geography, '')) CONTAINS 'росси')
                  AND NOT EXISTS {
                      MATCH (entity)-[:LOCATED_IN]-(russian:Geography)
                      WHERE toLower(coalesce(russian.name, '')) CONTAINS 'росси'
                         OR toLower(coalesce(russian.country, '')) CONTAINS 'росси'
                  }
              )
          )
          AND all(condition IN $numeric_conditions WHERE EXISTS {
              MATCH (entity)-[:HAS_FACT]->(fact:Fact)
              WHERE any(parameter_name IN condition.parameterNames WHERE
                  toLower(fact.name) CONTAINS parameter_name
              )
                AND (
                    condition.normalizedUnit IS NULL
                    OR fact.normalizedUnit = condition.normalizedUnit
                )
                AND (
                    (condition.operator = '<' AND fact.numericValue < condition.value)
                    OR (condition.operator = '<=' AND fact.numericValue <= condition.value)
                    OR (condition.operator = '>' AND fact.numericValue > condition.value)
                    OR (condition.operator = '>=' AND fact.numericValue >= condition.value)
                    OR (condition.operator = '=' AND fact.numericValue = condition.value)
                    OR (
                        condition.operator = 'BETWEEN'
                        AND coalesce(fact.minValue, fact.numericValue) >= condition.minValue
                        AND coalesce(fact.maxValue, fact.numericValue) <= condition.maxValue
                    )
                )
          })
        RETURN entity.id AS id
        """,
        parameters_={
            "entity_types": filters.entityTypes,
            "countries": filters.countries,
            "geography_scope": (
                filters.geographyScope
                if filters.geographyScope in {"domestic", "foreign"}
                else None
            ),
            "year_from": filters.yearFrom,
            "year_to": filters.yearTo,
            "numeric_conditions": numeric_conditions,
        },
        database_=settings.neo4j_database,
    )
    return {str(record["id"]) for record in records if record["id"]}


def retrieve_filtered_entity_contexts(
    entity_ids: set[str],
    include_source_text: bool,
) -> list[dict[str, Any]]:
    if not entity_ids:
        return []
    records, _, _ = driver.execute_query(
        """
        UNWIND $entity_ids AS entity_id
        MATCH (entity:__Entity__ {id: entity_id})
        OPTIONAL MATCH (entity)-[:HAS_FACT]->(fact:Fact)
        WITH entity, collect(DISTINCT {
            name: fact.name,
            operator: fact.operator,
            numericValue: fact.numericValue,
            minValue: fact.minValue,
            maxValue: fact.maxValue,
            unit: fact.normalizedUnit,
            textValue: fact.textValue
        }) AS facts
        OPTIONAL MATCH (entity)-[:MENTIONED_IN]->(chunk:Chunk)-[:FROM_DOCUMENT]->(document:Document)
        WITH entity, facts, chunk, document
        ORDER BY chunk.index
        WITH entity, facts,
             head(collect(chunk)) AS sourceChunk,
             head(collect(document)) AS sourceDocument
        OPTIONAL MATCH (entity)-[relation]-(neighbor:__Entity__)
        WHERE neighbor.id IN $entity_ids
        RETURN entity.id AS entityId,
               entity.name AS name,
               entity.description AS description,
               entity.entityType AS entityType,
               entity.geography AS geography,
               entity.publicationYear AS publicationYear,
               entity.confidence AS confidence,
               facts,
               sourceChunk.id AS chunkId,
               sourceChunk.text AS sourceText,
               sourceChunk.page AS page,
               sourceChunk.section AS section,
               sourceDocument.id AS documentId,
               sourceDocument.title AS documentTitle,
               collect(DISTINCT CASE WHEN relation IS NULL THEN null ELSE {
                   sourceId: startNode(relation).id,
                   relationship: type(relation),
                   targetId: endNode(relation).id
               } END) AS graphPaths
        LIMIT $limit
        """,
        parameters_={
            "entity_ids": sorted(entity_ids),
            "limit": settings.filtered_retrieval_top_k,
        },
        database_=settings.neo4j_database,
    )
    contexts: list[dict[str, Any]] = []
    for record in records:
        facts = [
            fact
            for fact in (record["facts"] or [])
            if fact and fact.get("name")
        ]
        fact_lines = [
            format_filtered_fact(fact)
            for fact in facts
        ]
        metadata = [
            f"Тип: {record['entityType']}",
            f"География: {record['geography'] or 'не указана'}",
            f"Год: {record['publicationYear'] or 'не указан'}",
            (
                "Достоверность: не указана"
                if record["confidence"] is None
                else f"Достоверность: {round(float(record['confidence']) * 100)}%"
            ),
        ]
        text_parts = [
            f"Сущность: {record['name']}",
            str(record["description"] or ""),
            *metadata,
            "Параметры:",
            *(fact_lines or ["- не указаны"]),
        ]
        if include_source_text and record["sourceText"]:
            text_parts.extend([
                "Подтверждающий фрагмент:",
                str(record["sourceText"]),
            ])
        text = "\n".join(text_parts)
        contexts.append({
            "chunkId": str(record["chunkId"] or f"filtered-{record['entityId']}"),
            "text": text,
            "page": int(record["page"] or 1),
            "section": str(record["section"] or "Структурированные данные"),
            "documentId": str(record["documentId"] or ""),
            "documentTitle": str(record["documentTitle"] or "Граф знаний"),
            "score": 1.0,
            "entityIds": [str(record["entityId"])],
            "entityType": str(record["entityType"] or "unclassified"),
            "entityLabel": str(record["name"] or record["entityId"]),
            "graphPaths": [
                path for path in (record["graphPaths"] or []) if path
            ],
            "source": "structured_filter",
        })
    return contexts


def format_filtered_fact(fact: dict[str, Any]) -> str:
    if fact.get("operator") == "BETWEEN":
        value = f"{fact.get('minValue')}–{fact.get('maxValue')}"
    elif fact.get("numericValue") is not None:
        value = (
            f"{fact.get('operator') or '='} "
            f"{fact.get('numericValue')}"
        )
    else:
        value = str(fact.get("textValue") or "")
    unit = fact.get("unit")
    return f"- {fact.get('name')}: {value}{' ' + unit if unit else ''}"


def normalize_numeric_condition(condition: Any) -> dict[str, Any]:
    payload = condition.model_dump()
    normalized_unit, factor = normalize_measurement_unit(condition.unit)
    if payload.get("value") is not None:
        payload["value"] = float(payload["value"]) * factor
    if payload.get("minValue") is not None:
        payload["minValue"] = float(payload["minValue"]) * factor
    if payload.get("maxValue") is not None:
        payload["maxValue"] = float(payload["maxValue"]) * factor
    payload["normalizedUnit"] = normalized_unit
    payload["parameterNames"] = parameter_aliases(condition.parameter)
    return payload


def parameter_aliases(value: str) -> list[str]:
    normalized = normalize_text(value)
    groups = {
        "температур": ["temperature", "температур"],
        "концентрац": ["concentration", "концентрац"],
        "содержан": ["content", "composition", "содержан"],
        "скорост": ["speed", "velocity", "flow", "скорост"],
        "давлен": ["pressure", "давлен"],
        "производительност": ["capacity", "productivity", "производительност"],
        "стоимост": ["cost", "price", "стоимост"],
        "затрат": ["cost", "expense", "затрат"],
    }
    for marker, aliases in groups.items():
        if marker in normalized:
            return aliases
    words = [word for word in normalized.split() if len(word) >= 3]
    return words or [normalized]


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
               entity.description AS description,
               entity.confidence AS confidence,
               entity.verificationStatus AS verificationStatus,
               entity.geography AS geography,
               entity.publicationYear AS publicationYear
        UNION
        UNWIND $entity_ids AS entity_id
        MATCH (document:Document {id: entity_id})
        RETURN document.id AS id,
               'document' AS type,
               document.title AS label,
               'Исходный документ базы знаний' AS description,
               null AS confidence,
               null AS verificationStatus,
               null AS geography,
               null AS publicationYear
        """,
        parameters_={"entity_ids": entity_ids},
        database_=settings.neo4j_database,
    )
    return [dict(record) for record in records]


def load_recommendations(entity_ids: list[str]) -> list[dict[str, Any]]:
    if not entity_ids:
        return []
    records, _, _ = driver.execute_query(
        """
        UNWIND $entity_ids AS entity_id
        MATCH (anchor:__Entity__ {id: entity_id})
        MATCH path = (anchor)-[*1..2]-(candidate:__Entity__)
        WHERE candidate.id <> anchor.id
          AND NOT candidate.id IN $entity_ids
          AND candidate.entityType IN ['technology', 'expert', 'process', 'publication']
          AND all(relation IN relationships(path)
                  WHERE type(relation) IN $knowledge_relationships)
        WITH candidate, count(DISTINCT anchor) AS matchedAnchors
        RETURN candidate.id AS id,
               candidate.entityType AS type,
               candidate.name AS label,
               CASE candidate.entityType
                   WHEN 'technology' THEN 'Похожее или связанное технологическое решение'
                   WHEN 'expert' THEN 'Эксперт по связанным процессам и технологиям'
                   WHEN 'process' THEN 'Смежный технологический процесс'
                   WHEN 'publication' THEN 'Дополнительная публикация по теме'
                   ELSE 'Связанное знание'
               END + '; связано с ' + toString(matchedAnchors) + ' найденными сущностями' AS reason
        ORDER BY matchedAnchors DESC, candidate.name
        LIMIT 6
        """,
        parameters_={
            "entity_ids": entity_ids,
            "knowledge_relationships": KNOWLEDGE_RELATIONSHIPS,
        },
        database_=settings.neo4j_database,
    )
    return [dict(record) for record in records]


def build_citations(contexts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    citations: list[dict[str, Any]] = []
    for context in contexts:
        has_document = bool(context["documentId"])
        entity_id = (
            context["documentId"]
            if has_document
            else next(iter(context.get("entityIds", [])), context["chunkId"])
        )
        citations.append(
            {
                "id": f"citation-{context['chunkId']}",
                "entityId": entity_id,
                "entityType": (
                    "document"
                    if has_document
                    else context.get("entityType", "unclassified")
                ),
                "label": (
                    context["documentTitle"]
                    if has_document
                    else context.get("entityLabel", "Граф знаний")
                ),
                "description": (
                    ("Фрагмент документа" if has_document else "Структурированное знание")
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
        "recommendations": [],
    }
