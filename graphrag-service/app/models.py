from typing import Any, Literal

from pydantic import BaseModel, Field


class EntityMention(BaseModel):
    id: str
    type: str
    label: str


class RetrieveRequest(BaseModel):
    query: str
    mentions: list[EntityMention] = Field(default_factory=list)
    graphDepth: int = Field(default=2, ge=1, le=2)


class ExtractRequest(BaseModel):
    documentId: str
    title: str
    type: Literal["pdf", "docx", "xlsx", "csv"]
    storageKey: str
    jobId: str | None = None


class SourceReference(BaseModel):
    documentId: str
    page: int | None = None


class EntityAttribute(BaseModel):
    name: str
    value: Any
    unit: str | None = None


class ExtractedEntity(BaseModel):
    id: str
    type: Literal[
        "material",
        "experiment",
        "data_issue",
        "property",
        "regime",
        "equipment",
        "team",
        "conclusion",
        "unclassified",
    ]
    name: str
    attributes: list[EntityAttribute] = Field(default_factory=list)
    source: SourceReference


class ExtractedRelation(BaseModel):
    id: str
    sourceId: str
    type: str
    targetId: str
    source: SourceReference


class PublishExtraction(BaseModel):
    documentId: str
    entities: list[ExtractedEntity] = Field(default_factory=list)
    relations: list[ExtractedRelation] = Field(default_factory=list)


class PublishRequest(BaseModel):
    extraction: PublishExtraction
    title: str
    type: Literal["pdf", "docx", "xlsx", "csv"]
    storageKey: str


class SourcePage(BaseModel):
    page: int
    text: str
    section: str | None = None
