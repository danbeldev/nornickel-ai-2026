from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI

from .extraction import extract_document
from .models import ExtractRequest, PublishRequest, RetrieveRequest
from .publication import publish_document
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
    return await extract_document(request)


@app.post("/internal/graphrag/publish")
async def publish_knowledge(request: PublishRequest) -> dict:
    return await publish_document(request)
