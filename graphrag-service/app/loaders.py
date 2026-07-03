import csv
import tempfile
from pathlib import Path

from minio import Minio
from neo4j_graphrag.experimental.components.text_splitters.fixed_size_splitter import (
    FixedSizeSplitter,
)
from neo4j_graphrag.experimental.components.types import TextChunk, TextChunks
from openpyxl import load_workbook
from pypdf import PdfReader

from .config import settings
from .docx_loader import load_docx_pages
from .models import ExtractRequest, SourcePage


minio_client = Minio(
    settings.minio_endpoint.replace("http://", "").replace("https://", ""),
    access_key=settings.minio_access_key,
    secret_key=settings.minio_secret_key,
    secure=settings.minio_endpoint.startswith("https://"),
)


def load_source_pages(request: ExtractRequest) -> list[SourcePage]:
    suffix = "." + request.type.lower().lstrip(".")
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        minio_client.fget_object(settings.minio_bucket, request.storageKey, tmp.name)
        path = Path(tmp.name)

    try:
        if request.type == "pdf":
            return [
                SourcePage(
                    page=index,
                    text=page.extract_text() or "",
                    section=f"Страница {index}",
                )
                for index, page in enumerate(PdfReader(str(path)).pages, start=1)
            ]
        if request.type == "docx":
            return load_docx_pages(path)
        if request.type == "xlsx":
            workbook = load_workbook(str(path), read_only=True, data_only=True)
            pages: list[SourcePage] = []
            for index, sheet in enumerate(workbook.worksheets, start=1):
                rows = [
                    " | ".join(str(cell) for cell in row if cell is not None)
                    for row in sheet.iter_rows(values_only=True)
                ]
                pages.append(
                    SourcePage(
                        page=index,
                        text="\n".join(row for row in rows if row),
                        section=sheet.title,
                    )
                )
            return pages
        if request.type == "csv":
            with path.open("r", encoding="utf-8", errors="ignore") as file:
                text = "\n".join(" | ".join(row) for row in csv.reader(file))
            return [SourcePage(page=1, text=text, section="CSV")]
        return [
            SourcePage(
                page=1,
                text=path.read_text(encoding="utf-8", errors="ignore"),
                section="Документ",
            )
        ]
    finally:
        path.unlink(missing_ok=True)


async def split_source_pages(
    document_id: str,
    pages: list[SourcePage],
) -> TextChunks:
    splitter = FixedSizeSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        approximate=False,
    )
    chunks: list[TextChunk] = []
    global_index = 0
    for page in pages:
        if not page.text.strip():
            continue
        page_chunks = await splitter.run(text=page.text)
        for page_chunk in page_chunks.chunks:
            chunks.append(
                TextChunk(
                    uid=f"{document_id}-chunk-{global_index}",
                    index=global_index,
                    text=page_chunk.text,
                    metadata={
                        "page": page.page,
                        "section": page.section or "",
                        "documentId": document_id,
                    },
                )
            )
            global_index += 1
    return TextChunks(chunks=chunks)
