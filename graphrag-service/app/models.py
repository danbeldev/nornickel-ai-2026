from typing import Any, Literal

from pydantic import BaseModel, Field


class EntityMention(BaseModel):
    id: str
    type: str
    label: str


class NumericFilter(BaseModel):
    parameter: str
    operator: str
    value: float | None = None
    minValue: float | None = None
    maxValue: float | None = None
    unit: str | None = None


class QueryFilters(BaseModel):
    entityTypes: list[str] = Field(default_factory=list)
    countries: list[str] = Field(default_factory=list)
    geographyScope: str | None = None
    yearFrom: int | None = None
    yearTo: int | None = None
    numericConditions: list[NumericFilter] = Field(default_factory=list)


class RetrieveRequest(BaseModel):
    query: str
    mentions: list[EntityMention] = Field(default_factory=list)
    graphDepth: int = Field(default=2, ge=1, le=4)
    filters: QueryFilters | None = None


class ExtractRequest(BaseModel):
    documentId: str
    title: str
    type: Literal["pdf", "docx", "xlsx", "csv"]
    storageKey: str
    jobId: str | None = None


class SourceReference(BaseModel):
    documentId: str
    page: int | None = None
    chunkId: str | None = None
    section: str | None = None
    quote: str | None = None


class EntityAttribute(BaseModel):
    name: str
    value: Any
    unit: str | None = None
    operator: str | None = None
    numericValue: float | None = None
    minValue: float | None = None
    maxValue: float | None = None
    normalizedUnit: str | None = None


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
        "process",
        "publication",
        "expert",
        "facility",
        "technology",
        "geography",
        "economic_indicator",
        "unclassified",
    ]
    name: str
    attributes: list[EntityAttribute] = Field(default_factory=list)
    source: SourceReference
    confidence: float | None = None
    verificationStatus: str | None = None
    geography: str | None = None
    year: int | None = None
    language: str | None = None


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


class UpdateEntityRequest(BaseModel):
    id: str
    type: str
    name: str
    description: str
    attributes: list[EntityAttribute] = Field(default_factory=list)
    confidence: float = 0.7
    verificationStatus: str = "REVIEWED"
    geography: str | None = None
    publicationYear: int | None = None
    language: str | None = None


class DataIssueRequest(BaseModel):
    id: str
    title: str
    description: str
    issueType: str
    severity: str
    recommendation: str
    relatedEntityIds: list[str] = Field(default_factory=list)


class RelationUpdateRequest(BaseModel):
    id: str
    relationType: str


class CreateRelationRequest(BaseModel):
    id: str
    sourceId: str
    targetId: str
    relationType: str


class MergeEntitiesRequest(BaseModel):
    sourceId: str
    targetId: str


class SourcePage(BaseModel):
    page: int
    text: str
    section: str | None = None
