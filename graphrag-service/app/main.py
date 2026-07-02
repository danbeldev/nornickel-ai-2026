from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, HTTPException

from .extraction import extract_document
from .models import ExtractRequest, PublishRequest, RetrieveRequest
from .publication import publish_document
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
