from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel


app = FastAPI(title="Nornickel GraphRAG Service Stub")


class EntityMention(BaseModel):
    id: str
    type: str
    label: str


class RetrieveRequest(BaseModel):
    query: str
    mentions: list[EntityMention] = []


class ExtractRequest(BaseModel):
    documentId: str
    title: str
    type: str
    storageKey: str | None = None


class PublishRequest(BaseModel):
    extraction: dict[str, Any]


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/internal/graphrag/retrieve")
def retrieve(request: RetrieveRequest) -> dict[str, Any]:
    citations = [
        {
            "id": f"citation-mentioned-{mention.type}-{mention.id}",
            "entityId": mention.id,
            "entityType": mention.type,
            "label": mention.label,
            "description": "Сущность добавлена пользователем в контекст запроса",
            "page": None,
        }
        for mention in request.mentions
    ]

    return {
        "answerHint": "Stub GraphRAG: подключите neo4j-graphrag-python для production retrieval.",
        "citations": citations,
        "sourcesFound": max(len(citations), 3),
        "experimentsFound": 2,
        "contextChunks": [
            "Контекст-заглушка: документ, материал и эксперимент связаны через граф знаний.",
            f"Запрос пользователя: {request.query}",
        ],
    }


@app.post("/internal/graphrag/extract")
def extract(request: ExtractRequest) -> dict[str, Any]:
    document_id = request.documentId

    return {
        "documentId": document_id,
        "entities": [
            {
                "id": f"{document_id}-material-n47",
                "type": "material",
                "name": "Сплав N-47",
                "attributes": [
                    {"name": "Ni", "value": 54.2, "unit": "%"},
                    {"name": "Cr", "value": 21.1, "unit": "%"},
                ],
                "source": {"documentId": document_id, "page": 3},
            },
            {
                "id": f"{document_id}-experiment-1",
                "type": "experiment",
                "name": "Термообработка сплава N-47",
                "attributes": [
                    {"name": "Температура", "value": 780, "unit": "°C"},
                    {"name": "Длительность", "value": 4, "unit": "ч"},
                ],
                "source": {"documentId": document_id, "page": 8},
            },
            {
                "id": f"{document_id}-property-hardness",
                "type": "property",
                "name": "Твердость",
                "attributes": [
                    {"name": "До обработки", "value": 29, "unit": "HRC"},
                    {"name": "После обработки", "value": 36, "unit": "HRC"},
                ],
                "source": {"documentId": document_id, "page": 11},
            },
            {
                "id": f"{document_id}-unclassified-method",
                "type": "unclassified",
                "name": "Метод микродюрометрии M-7",
                "attributes": [
                    {
                        "name": "Контекст",
                        "value": "Использован для контрольного измерения твердости",
                        "unit": None,
                    }
                ],
                "source": {"documentId": document_id, "page": 10},
            },
        ],
        "relations": [
            {
                "id": f"{document_id}-relation-1",
                "sourceId": f"{document_id}-experiment-1",
                "type": "USES_MATERIAL",
                "targetId": f"{document_id}-material-n47",
                "source": {"documentId": document_id, "page": 8},
            },
            {
                "id": f"{document_id}-relation-2",
                "sourceId": f"{document_id}-experiment-1",
                "type": "MEASURES",
                "targetId": f"{document_id}-property-hardness",
                "source": {"documentId": document_id, "page": 11},
            },
            {
                "id": f"{document_id}-relation-3",
                "sourceId": f"{document_id}-experiment-1",
                "type": "USES",
                "targetId": f"{document_id}-unclassified-method",
                "source": {"documentId": document_id, "page": 10},
            },
        ],
        "warnings": ["Тип сущности «Метод микродюрометрии M-7» определен как unclassified."],
    }


@app.post("/internal/graphrag/publish")
def publish(request: PublishRequest) -> dict[str, Any]:
    extraction = request.extraction
    entities = extraction.get("entities", [])
    relations = extraction.get("relations", [])

    return {
        "result": {
            "documentId": extraction.get("documentId"),
            "publishedEntityIds": [entity["id"] for entity in entities],
            "publishedRelationIds": [relation["id"] for relation in relations],
        }
    }
