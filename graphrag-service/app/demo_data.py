import asyncio
import io
import tempfile
from pathlib import Path
from typing import Any

import fitz
from PIL import Image

from .config import settings
from .loaders import minio_client
from .models import ExtractRequest
from .operations import report_progress
from .visual_analysis import store_visual


VISUAL_ID = "visual-dispersion-map-after"


async def extract_demo_document(request: ExtractRequest) -> dict[str, Any]:
    stages = [
        (10, "Загрузка и чтение документа"),
        (18, "Анализ текста и визуальных данных: найден рисунок 5"),
        (27, "Документ разделён на 31 смысловой фрагмент"),
        (38, "Построение векторных представлений"),
        (54, "Извлечение материалов, процессов и экспериментов"),
        (69, "Извлечение свойств, численных значений и связей"),
        (82, "Проверка синонимов и устранение дублей"),
        (90, "Обнаружение ограничений и проблем в данных"),
    ]
    for progress, stage in stages:
        await report_progress(request.jobId or "", progress, stage)
        await asyncio.sleep(settings.demo_document_step_delay_ms / 1000)

    visual = await _store_figure_five(request)
    source = _source(request.documentId, 10, "Результаты и обсуждение")
    figure_source = _source(
        request.documentId,
        11,
        "Рисунок 5",
        visual_id=VISUAL_ID,
        visual_type="image",
    )
    entities = [
        _entity("publication-dust-suppression", "publication",
                "Исследование пылеподавления на хвостохранилищах",
                source, {"publication_type": "научная статья", "language": "русский"}),
        _entity("material-dust-2908", "material", "Неорганическая пыль 2908",
                source, {"category": "взвешенные частицы"}),
        _entity("technology-rutrol-ad-171", "technology", "Rutrol AD 171",
                _source(request.documentId, 6, "Полевые испытания"),
                {"application": "закрепление пылящей поверхности", "working_concentration": "3 %"}),
        _entity("process-dust-suppression", "process",
                "Пылеподавление на хвостохранилищах", source,
                {"description": "орошение поверхности закрепляющим реагентом"}),
        _entity("experiment-laboratory-rutrol", "experiment",
                "Лабораторные испытания Rutrol AD 171",
                _source(request.documentId, 9, "Лабораторные испытания"),
                {"result": "эффективность 99,09–99,66 % при расходе 30–40 г/м²"}),
        _entity("experiment-dispersion-2908", "experiment",
                "Расчёт рассеивания вещества 2908", figure_source,
                {"result": "снижение концентрации в жилой зоне с 0,45 до 0,05 ПДК"}),
        _entity("equipment-ekolog-4-7", "equipment", "УПРЗА «Эколог» 4.7",
                _source(request.documentId, 9, "Моделирование рассеивания"),
                {"model": "4.7"}),
        _entity("property-efficiency", "property", "Эффективность пылеподавления",
                _source(request.documentId, 10, "Таблица 3"),
                {"unit": "%", "value": "99,09–99,66"}),
        _entity("property-concentration", "property",
                "Концентрация пыли в жилой зоне", source,
                {"unit": "ПДК", "value_before": "0,45", "value_after": "0,05"}),
        _entity("property-emission", "property", "Валовый выброс пыли", source,
                {"unit": "т/год", "value_before": "275,4", "value_after": "27,54"}),
        _entity("facility-tailings-1", "facility", "Хвостохранилище № 1",
                source, {"facility_type": "хвостохранилище"}),
        _entity("facility-lebyazhye", "facility", "Хвостохранилище «Лебяжье»",
                source, {"facility_type": "хвостохранилище"}),
        _entity("conclusion-optimal-dose", "conclusion",
                "Оптимальный расход реагента — 30–40 г/м²",
                _source(request.documentId, 6, "Полевые испытания"),
                {"statement": "наилучшие полевые результаты получены при рабочей концентрации 3 %"}),
        _entity("issue-full-scale-trials", "data_issue",
                "Необходимы полномасштабные промышленные испытания",
                _source(request.documentId, 13, "Заключение"),
                {"issue_type": "insufficient_validation", "severity": "medium",
                 "recommendation": "провести полномасштабные испытания на хвостохранилище"}),
    ]
    relations = [
        _relation("r1", "publication-dust-suppression", "DESCRIBES", "process-dust-suppression", source),
        _relation("r2", "publication-dust-suppression", "DESCRIBES", "experiment-laboratory-rutrol", source),
        _relation("r3", "publication-dust-suppression", "DESCRIBES", "experiment-dispersion-2908", source),
        _relation("r4", "process-dust-suppression", "USES", "technology-rutrol-ad-171", source),
        _relation("r5", "process-dust-suppression", "USES_MATERIAL", "material-dust-2908", source),
        _relation("r6", "process-dust-suppression", "IMPLEMENTED_AT", "facility-tailings-1", source),
        _relation("r7", "process-dust-suppression", "IMPLEMENTED_AT", "facility-lebyazhye", source),
        _relation("r8", "technology-rutrol-ad-171", "VALIDATED_BY", "experiment-laboratory-rutrol", source),
        _relation("r9", "experiment-laboratory-rutrol", "MEASURES", "property-efficiency", source),
        _relation("r10", "experiment-dispersion-2908", "USES_MATERIAL", "material-dust-2908", figure_source),
        _relation("r11", "experiment-dispersion-2908", "USES_EQUIPMENT", "equipment-ekolog-4-7", figure_source),
        _relation("r12", "experiment-dispersion-2908", "MEASURES", "property-concentration", figure_source),
        _relation("r13", "experiment-dispersion-2908", "MEASURES", "property-emission", source),
        _relation("r14", "experiment-laboratory-rutrol", "PRODUCES_CONCLUSION", "conclusion-optimal-dose", source),
        _relation("r15", "issue-full-scale-trials", "RELATED_TO", "technology-rutrol-ad-171", source),
    ]
    warnings = [
        "Для подтверждения результата рекомендованы полномасштабные промышленные испытания.",
        "Полевые наблюдения после нанесения реагента охватывают ограниченный период.",
        "Влияние сильного ветра и осадков требует дополнительной проверки.",
        "Расчёт рассеивания использует консервативную эффективность 90 %, отличающуюся от лабораторной оценки свыше 99 %.",
    ]
    await report_progress(request.jobId or "", 94, "Черновик извлечения сформирован")
    return {
        "documentId": request.documentId,
        "entities": entities,
        "relations": relations,
        "visualFragments": [visual],
        "warnings": warnings,
        "tokenUsage": [
            {"model": "YandexGPT 5.1", "promptTokens": 6180,
             "completionTokens": 1940, "totalTokens": 8120},
            {"model": "YandexGPT 5.1 Vision", "promptTokens": 1640,
             "completionTokens": 530, "totalTokens": 2170},
            {"model": "text-embeddings-v2-doc", "promptTokens": 4870,
             "completionTokens": 0, "totalTokens": 4870},
        ],
    }


def _entity(entity_id: str, entity_type: str, name: str,
            source: dict[str, Any], attributes: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": entity_id, "type": entity_type, "name": name,
        "attributes": [{"name": key, "value": value} for key, value in attributes.items()],
        "source": source, "confidence": 0.94,
        "verificationStatus": "REVIEW_REQUIRED",
    }


def _relation(relation_id: str, source_id: str, relation_type: str,
              target_id: str, source: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": relation_id, "sourceId": source_id, "type": relation_type,
        "targetId": target_id, "source": source,
    }


def _source(document_id: str, page: int, section: str,
            visual_id: str | None = None,
            visual_type: str | None = None) -> dict[str, Any]:
    return {
        "documentId": document_id, "page": page, "section": section,
        "visualId": visual_id, "visualType": visual_type,
    }


async def _store_figure_five(request: ExtractRequest) -> dict[str, Any]:
    storage_key = f"visuals/{request.documentId}/{VISUAL_ID}.jpg"
    image = await asyncio.to_thread(_crop_figure_five, request)
    await store_visual(storage_key, image)
    return {
        "id": VISUAL_ID,
        "type": "image",
        "page": 11,
        "section": "Результаты расчёта рассеивания",
        "title": "Рисунок 5. Карта расчета рассеивания по веществу 2908 после применения мероприятий по пылеподавлению",
        "description": "Карта показывает область рассеивания вещества 2908 после применения мероприятий по пылеподавлению.",
        "structuredData": "В легенде отображены изолинии 0,05 и 0,1 ПДК.",
        "confidence": 0.99,
        "estimated": False,
        "storageKey": storage_key,
        "contentType": "image/jpeg",
    }


def _crop_figure_five(request: ExtractRequest) -> bytes:
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as temporary:
        path = Path(temporary.name)
    try:
        minio_client.fget_object(settings.minio_bucket, request.storageKey, str(path))
        document = fitz.open(path)
        page = document[10]
        pixmap = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0), alpha=False)
        image = Image.open(io.BytesIO(pixmap.tobytes("png"))).convert("RGB")
        width, height = image.size
        crop = image.crop((int(width * 0.50), int(height * 0.08),
                           int(width * 0.98), int(height * 0.88)))
        output = io.BytesIO()
        crop.save(output, "JPEG", quality=88, optimize=True)
        return output.getvalue()
    finally:
        path.unlink(missing_ok=True)
