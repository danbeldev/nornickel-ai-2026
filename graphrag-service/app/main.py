from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, HTTPException

from .extraction import extract_document
from .models import (
    DataIssueRequest,
    CreateRelationRequest,
    ExtractRequest,
    MergeEntitiesRequest,
    PublishRequest,
    RelationUpdateRequest,
    RetrieveRequest,
    UpdateEntityRequest,
)
from .publication import (
    delete_relation,
    create_relation,
    merge_entities,
    publish_document,
    update_entity,
    update_relation,
    upsert_data_issue,
)
from .operations import OperationCanceled, operations
from .resources import driver
from .retrieval import retrieve


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    yield
    driver.close()


app = FastAPI(
    title="Nornickel GraphRAG Service",
    version="0.2.0",
    lifespan=lifespan,
)


@app.get("/health")
def health() -> dict[str, str]:
    driver.verify_connectivity()
    return {"status": "ok"}


@app.post("/internal/graphrag/retrieve")
def retrieve_knowledge(request: RetrieveRequest) -> dict:
    return retrieve(request)


@app.post("/internal/graphrag/extract")
async def extract_knowledge(request: ExtractRequest) -> dict:
    try:
        return await extract_document(request)
    except OperationCanceled as exception:
        raise HTTPException(status_code=409, detail="Обработка отменена") from exception


@app.post("/internal/graphrag/operations/{job_id}/cancel")
async def cancel_operation(job_id: str) -> dict[str, bool]:
    return {"activeOperationCanceled": operations.cancel(job_id)}


@app.post("/internal/graphrag/publish")
async def publish_knowledge(request: PublishRequest) -> dict:
    return await publish_document(request)


@app.put("/internal/graphrag/entities/{entity_id}")
def update_knowledge_entity(
    entity_id: str,
    request: UpdateEntityRequest,
) -> dict[str, str]:
    if entity_id != request.id:
        raise HTTPException(status_code=400, detail="Entity id mismatch")
    update_entity(request)
    return {"id": entity_id}


@app.put("/internal/graphrag/data-issues/{issue_id}")
def synchronize_data_issue(
    issue_id: str,
    request: DataIssueRequest,
) -> dict[str, str]:
    if issue_id != request.id:
        raise HTTPException(status_code=400, detail="Issue id mismatch")
    upsert_data_issue(request)
    return {"id": issue_id}


@app.put("/internal/graphrag/relations/{relation_id}")
def update_knowledge_relation(
    relation_id: str,
    request: RelationUpdateRequest,
) -> dict[str, str]:
    if relation_id != request.id:
        raise HTTPException(status_code=400, detail="Relation id mismatch")
    update_relation(request)
    return {"id": relation_id}


@app.post("/internal/graphrag/relations")
def create_knowledge_relation(
    request: CreateRelationRequest,
) -> dict[str, str]:
    create_relation(request)
    return {"id": request.id}


@app.delete("/internal/graphrag/relations/{relation_id}")
def delete_knowledge_relation(relation_id: str) -> dict[str, str]:
    delete_relation(relation_id)
    return {"id": relation_id}


@app.post("/internal/graphrag/entities/merge")
def merge_knowledge_entities(
    request: MergeEntitiesRequest,
) -> dict[str, str]:
    merge_entities(request)
    return {"id": request.targetId}
