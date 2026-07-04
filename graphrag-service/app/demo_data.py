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
from .operations import report_partial_draft, report_progress
from .visual_analysis import store_visual


VISUAL_ID = "visual-dispersion-map-after"


async def extract_demo_document(request: ExtractRequest) -> dict[str, Any]:
    if _is_mdpi_demo(request):
        return await _extract_mdpi_demo(request)

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
    stages = [
        (10, "Загрузка и чтение документа"),
        (18, "Анализ текста и визуальных данных: найден рисунок 5"),
        (27, "Документ разделён на 31 смысловой фрагмент"),
        (38, "Построение векторных представлений"),
        (54, "LLM извлекает материалы, процессы и эксперименты"),
        (69, "LLM извлекает свойства, численные значения и связи"),
        (82, "Проверка синонимов и устранение дублей"),
        (90, "Обнаружение ограничений и проблем в данных"),
    ]
    await _run_demo_stages(
        request,
        stages,
        entities,
        relations,
        [visual],
        warnings,
    )
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


async def _extract_mdpi_demo(request: ExtractRequest) -> dict[str, Any]:
    source = _source(request.documentId, 1, "Abstract and conclusions")
    entities = [
        _entity(
            "publication-mtdna-nanoparticles-meta-analysis",
            "publication",
            "Toxicity Evaluation of Nano-Sized Particles",
            source,
            {
                "publication_type": "systematic review and meta-analysis",
                "year": 2026,
                "doi": "10.3390/antiox15070848",
            },
        ),
        _entity(
            "material-nano-sized-particles",
            "material",
            "Nano-sized particles",
            source,
            {"category": "environmental pollutants", "size": "1–100 nm"},
        ),
        _entity(
            "process-nanoparticle-exposure",
            "process",
            "Exposure to nano-sized particles",
            source,
            {"application": "in vitro and in vivo pre-clinical studies"},
        ),
        _entity(
            "experiment-meta-analysis-in-vitro",
            "experiment",
            "Meta-analysis of in vitro studies",
            source,
            {"sample_size": "19 studies, 69 datasets"},
        ),
        _entity(
            "property-mtdna-content",
            "property",
            "mtDNA content",
            source,
            {"effect": "significantly reduced", "SMD": "−1.08", "p_value": "0.001"},
        ),
        _entity(
            "property-mtdna-encoded-genes",
            "property",
            "Expression of mtDNA-encoded genes",
            source,
            {"effect": "ND1, COX1, COX2, CYTB and ATP6 down-regulated"},
        ),
        _entity(
            "property-mitochondrial-biogenesis",
            "property",
            "Mitochondrial biogenesis genes",
            source,
            {"effect": "SIRT1, PGC-1α and TFAM down-regulated"},
        ),
        _entity(
            "property-mitochondrial-dynamics",
            "property",
            "Mitochondrial fusion and fission genes",
            source,
            {
                "effect": "MFN1, MFN2 and OPA1 down-regulated; "
                "DRP1 and FIS1 up-regulated"
            },
        ),
        _entity(
            "conclusion-nanoparticles-mtdna",
            "conclusion",
            "Nano-sized particles disrupt mtDNA maintenance",
            source,
            {
                "statement": "mtDNA depletion and altered maintenance-gene "
                "expression may contribute to particle-induced diseases"
            },
        ),
        _entity(
            "issue-meta-analysis-heterogeneity",
            "data_issue",
            "Strong or moderate statistical heterogeneity",
            source,
            {
                "issue_type": "heterogeneity",
                "severity": "medium",
                "recommendation": "confirm findings in additional comparative "
                "pre-clinical and clinical studies",
            },
        ),
    ]
    relations = [
        _relation("mdpi-r1", entities[0]["id"], "DESCRIBES", entities[2]["id"], source),
        _relation("mdpi-r2", entities[0]["id"], "DESCRIBES", entities[3]["id"], source),
        _relation("mdpi-r3", entities[0]["id"], "DESCRIBES", entities[4]["id"], source),
        _relation("mdpi-r4", entities[2]["id"], "USES_MATERIAL", entities[1]["id"], source),
        _relation("mdpi-r5", entities[3]["id"], "USES_MATERIAL", entities[1]["id"], source),
        _relation("mdpi-r6", entities[3]["id"], "MEASURES", entities[4]["id"], source),
        _relation("mdpi-r7", entities[3]["id"], "MEASURES", entities[5]["id"], source),
        _relation("mdpi-r8", entities[3]["id"], "MEASURES", entities[6]["id"], source),
        _relation("mdpi-r9", entities[3]["id"], "MEASURES", entities[7]["id"], source),
        _relation("mdpi-r10", entities[3]["id"], "PRODUCES_CONCLUSION", entities[8]["id"], source),
        _relation("mdpi-r11", entities[9]["id"], "RELATED_TO", entities[0]["id"], source),
    ]
    warnings = [
        "Для части показателей использовано небольшое количество исследований.",
        "Большинство включённых публикаций выполнено в странах Азии.",
        "Авторы отмечают сильную или умеренную статистическую неоднородность.",
        "Для переноса выводов на людей необходимы дополнительные клинические исследования.",
    ]
    stages = [
        (10, "Загрузка HTML-статьи и метаданных"),
        (18, "Анализ структуры, аннотации и текста статьи"),
        (27, "Статья разделена на 24 смысловых фрагмента"),
        (38, "Построение векторных представлений"),
        (54, "LLM извлекает исследования и показатели mtDNA"),
        (69, "LLM связывает гены биогенеза, слияния и деления"),
        (82, "Проверка терминов, синонимов и дублей"),
        (90, "Обнаружение ограничений метаанализа"),
    ]
    await _run_demo_stages(
        request,
        stages,
        entities,
        relations,
        [],
        warnings,
    )
    await report_progress(request.jobId or "", 94, "Черновик извлечения сформирован")
    return {
        "documentId": request.documentId,
        "entities": entities,
        "relations": relations,
        "visualFragments": [],
        "warnings": warnings,
        "tokenUsage": [
            {
                "model": "YandexGPT 5.1",
                "promptTokens": 7240,
                "completionTokens": 2180,
                "totalTokens": 9420,
            },
            {
                "model": "text-embeddings-v2-doc",
                "promptTokens": 5320,
                "completionTokens": 0,
                "totalTokens": 5320,
            },
        ],
    }


async def _run_demo_stages(
    request: ExtractRequest,
    stages: list[tuple[int, str]],
    entities: list[dict[str, Any]],
    relations: list[dict[str, Any]],
    visual_fragments: list[dict[str, Any]],
    warnings: list[str],
) -> None:
    for index, (progress, stage) in enumerate(stages):
        await report_progress(request.jobId or "", progress, stage)
        if index > 0:
            entity_count = max(
                1,
                round(len(entities) * index / (len(stages) - 1)),
            )
            relation_count = round(
                len(relations) * max(0, index - 2) / (len(stages) - 3)
            )
            partial = {
                "documentId": request.documentId,
                "entities": entities[:entity_count],
                "relations": relations[:relation_count],
                "visualFragments": (
                    visual_fragments if progress >= 69 else []
                ),
                "warnings": warnings[:1] if progress >= 82 else [],
                "tokenUsage": [],
            }
            await report_partial_draft(request.documentId, partial)
        await asyncio.sleep(settings.demo_document_step_delay_ms / 1000)


def _is_mdpi_demo(request: ExtractRequest) -> bool:
    return bool(
        request.sourceUrl
        and request.sourceUrl.rstrip("/").lower()
        == "https://www.mdpi.com/2076-3921/15/7/848"
    )


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
