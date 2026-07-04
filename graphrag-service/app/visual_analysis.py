import asyncio
import base64
import hashlib
import io
import json
import re
from collections.abc import Awaitable, Callable
from typing import Any

import httpx
from PIL import Image

from .config import settings
from .loaders import minio_client
from .models import ExtractRequest, SourcePage, VisualFragment
from .token_usage import record_usage
from .visual_types import VisualCandidate


VISION_PROMPT = """
Ты анализируешь визуальный фрагмент научного документа.
Определи его тип и опиши только то, что действительно видно.

Верни один JSON-объект:
{
  "type": "chart|diagram|image|table",
  "title": "краткое название",
  "description": "что изображено и какой научный вывод можно прочитать",
  "structuredData": "оси, легенда, подписанные значения, этапы или компоненты",
  "confidence": 0.0,
  "estimated": false
}

Правила:
- не выдумывай отсутствующие числа, единицы, названия и причинные связи;
- точные значения указывай только при наличии читаемой подписи;
- значения, приблизительно считанные с графика, помечай estimated=true;
- для схем перечисли компоненты и направления связей;
- для фотографии опиши объект без угадывания модели или характеристик;
- верни только JSON без Markdown.
""".strip()


async def analyze_visual_candidates(
    request: ExtractRequest,
    candidates: list[VisualCandidate],
    on_progress: Callable[[int, int, VisualCandidate], Awaitable[None]]
    | None = None,
) -> tuple[list[VisualFragment], list[str]]:
    fragments: list[VisualFragment] = []
    warnings: list[str] = []
    seen: set[str] = set()
    selected = prioritize_candidates(candidates)

    for index, candidate in enumerate(selected, start=1):
        if on_progress is not None:
            await on_progress(index, len(selected), candidate)
        fingerprint = candidate_fingerprint(candidate)
        if fingerprint in seen:
            continue
        seen.add(fingerprint)
        fragment_id = f"visual-{fingerprint[:20]}"
        if candidate.image is None:
            fragments.append(
                VisualFragment(
                    id=fragment_id,
                    type=normalize_visual_type(candidate.kind),
                    page=candidate.page,
                    section=candidate.section,
                    title=candidate.title,
                    description=default_description(candidate),
                    structuredData=candidate.text or None,
                    confidence=0.98,
                    estimated=False,
                )
            )
            continue

        normalized_image = normalize_image(candidate.image)
        if normalized_image is None:
            continue
        storage_key: str | None = (
            f"visuals/{request.documentId}/{fragment_id}.jpg"
        )
        try:
            await store_visual(storage_key, normalized_image)
        except Exception as exception:
            storage_key = None
            warnings.append(
                f"Изображение со страницы {candidate.page} не сохранено: "
                f"{exception}."
            )
        try:
            analysis = await analyze_image(candidate, normalized_image)
            fragments.append(
                VisualFragment(
                    id=fragment_id,
                    type=normalize_visual_type(
                        str(analysis.get("type") or candidate.kind)
                    ),
                    page=candidate.page,
                    section=candidate.section,
                    title=str(
                        analysis.get("title")
                        or candidate.title
                    )[:300],
                    description=str(
                        analysis.get("description")
                        or default_description(candidate)
                    ),
                    structuredData=optional_text(
                        analysis.get("structuredData")
                    ),
                    confidence=bounded_confidence(
                        analysis.get("confidence")
                    ),
                    estimated=boolean_value(
                        analysis.get("estimated", False)
                    ),
                    storageKey=storage_key,
                    contentType="image/jpeg",
                )
            )
        except Exception as exception:
            fragments.append(
                VisualFragment(
                    id=fragment_id,
                    type=normalize_visual_type(candidate.kind),
                    page=candidate.page,
                    section=candidate.section,
                    title=candidate.title,
                    description=default_description(candidate),
                    structuredData=candidate.text or None,
                    confidence=0.35,
                    estimated=False,
                    storageKey=storage_key,
                    contentType="image/jpeg",
                )
            )
            warnings.append(
                f"Визуальный фрагмент на странице {candidate.page} "
                f"не проанализирован: {exception}."
            )

    return fragments, warnings


def visual_fragments_to_pages(
    fragments: list[VisualFragment],
) -> list[SourcePage]:
    result: list[SourcePage] = []
    for fragment in fragments:
        parts = [
            (
                f"[Визуальный фрагмент: {fragment.type}; "
                f"id: {fragment.id}]"
            ),
            fragment.title,
            fragment.description,
        ]
        if fragment.structuredData:
            parts.extend(
                ["Структурированные данные:", fragment.structuredData]
            )
        if fragment.estimated:
            parts.append(
                "Численные значения визуально оценены и не являются точными."
            )
        result.append(
            SourcePage(
                page=fragment.page,
                section=fragment.section or "Визуальный фрагмент",
                text="\n".join(part for part in parts if part),
                visualId=fragment.id,
                visualType=fragment.type,
            )
        )
    return result


def prioritize_candidates(
    candidates: list[VisualCandidate],
) -> list[VisualCandidate]:
    tables = [
        candidate
        for candidate in candidates
        if candidate.kind in {"table", "chart"}
    ]
    images = [
        candidate
        for candidate in candidates
        if candidate.kind not in {"table", "chart"}
    ]
    limit = max(1, settings.max_visual_fragments)
    first_group_limit = (limit + 1) // 2
    selected = [
        *tables[:first_group_limit],
        *images[: limit - first_group_limit],
    ]
    if len(selected) < limit:
        selected.extend(
            [
                *tables[first_group_limit:],
                *images[limit - first_group_limit:],
            ][: limit - len(selected)]
        )
    return selected


async def analyze_image(
    candidate: VisualCandidate,
    image: bytes,
) -> dict[str, Any]:
    encoded = base64.b64encode(image).decode("ascii")
    context = candidate.text.strip()
    prompt = VISION_PROMPT
    if context:
        prompt += f"\n\nТекст рядом с визуальным фрагментом:\n{context[:1800]}"
    payload = {
        "model": settings.vision_model,
        "temperature": 0,
        "max_output_tokens": 1200,
        "input": [
            {
                "role": "user",
                "content": [
                    {"type": "input_text", "text": prompt},
                    {
                        "type": "input_image",
                        "image_url": f"data:image/jpeg;base64,{encoded}",
                    },
                ],
            }
        ],
    }
    headers = {
        "Authorization": f"Api-Key {settings.yandex_api_key}",
        "Content-Type": "application/json",
    }
    last_error: Exception | None = None
    async with httpx.AsyncClient(timeout=180) as client:
        for attempt in range(1, 3):
            try:
                response = await client.post(
                    f"{settings.yandex_base_url}/responses",
                    headers=headers,
                    json=payload,
                )
                response.raise_for_status()
                response_payload = response.json()
                usage = response_payload.get("usage") or {}
                record_usage(
                    str(response_payload.get("model") or settings.vision_model),
                    usage.get("input_tokens"),
                    usage.get("output_tokens"),
                    usage.get("total_tokens"),
                )
                text = extract_response_text(response_payload)
                if not text:
                    raise ValueError("модель вернула пустое описание")
                return json.loads(strip_json_fence(text))
            except asyncio.CancelledError:
                raise
            except Exception as exception:
                last_error = exception
                if attempt < 2:
                    await asyncio.sleep(attempt)
    raise ValueError(
        f"не удалось получить структурированное описание: {last_error}"
    )


def extract_response_text(payload: dict[str, Any]) -> str:
    for output in payload.get("output") or []:
        for content in output.get("content") or []:
            text = content.get("text")
            if text:
                return str(text)
    text = payload.get("text")
    return str(text) if text else ""


def normalize_image(raw: bytes) -> bytes | None:
    try:
        with Image.open(io.BytesIO(raw)) as image:
            width, height = image.size
            if width < 160 or height < 120:
                return None
            image = image.convert("RGB")
            image.thumbnail(
                (
                    settings.max_visual_image_size,
                    settings.max_visual_image_size,
                )
            )
            output = io.BytesIO()
            image.save(output, format="JPEG", quality=82, optimize=True)
            return output.getvalue()
    except Exception:
        return None


async def store_visual(storage_key: str, content: bytes) -> None:
    def upload() -> None:
        minio_client.put_object(
            settings.minio_bucket,
            storage_key,
            io.BytesIO(content),
            length=len(content),
            content_type="image/jpeg",
        )

    await asyncio.to_thread(upload)


def candidate_fingerprint(candidate: VisualCandidate) -> str:
    digest = hashlib.sha256()
    digest.update(candidate.kind.encode())
    digest.update(str(candidate.page).encode())
    digest.update(candidate.title.encode("utf-8", errors="ignore"))
    digest.update(candidate.text.encode("utf-8", errors="ignore"))
    if candidate.image:
        digest.update(candidate.image)
    return digest.hexdigest()


def default_description(candidate: VisualCandidate) -> str:
    if candidate.kind == "table":
        return "Структурированная таблица, извлечённая из документа."
    if candidate.kind == "chart":
        return "Структурированные данные графика, извлечённые из документа."
    if candidate.kind == "diagram":
        return "Структура схемы, извлечённая из документа."
    return "Визуальный фрагмент научного документа."


def normalize_visual_type(value: str) -> str:
    normalized = value.strip().lower()
    return normalized if normalized in {
        "table",
        "chart",
        "diagram",
        "image",
    } else "image"


def bounded_confidence(value: Any) -> float:
    try:
        return max(0.0, min(1.0, float(value)))
    except (TypeError, ValueError):
        return 0.65


def optional_text(value: Any) -> str | None:
    if isinstance(value, (dict, list)):
        text = json.dumps(value, ensure_ascii=False)
    else:
        text = str(value or "").strip()
    return text or None


def boolean_value(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"true", "1", "yes", "да"}


def strip_json_fence(value: str) -> str:
    cleaned = value.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    return cleaned.strip()
