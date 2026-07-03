import asyncio
import json
import logging
import re
from typing import Any, Optional

from neo4j_graphrag.exceptions import LLMGenerationError
from neo4j_graphrag.experimental.components.entity_relation_extractor import (
    LLMEntityRelationExtractor,
    OnError,
    fix_invalid_json,
)
from neo4j_graphrag.experimental.components.schema import GraphSchema
from neo4j_graphrag.experimental.components.types import (
    DocumentInfo,
    LexicalGraphConfig,
    Neo4jGraph,
    TextChunk,
    TextChunks,
)
from neo4j_graphrag.experimental.pipeline.exceptions import InvalidJSONError
from pydantic import ValidationError


logger = logging.getLogger(__name__)


class NullSafeLLMEntityRelationExtractor(LLMEntityRelationExtractor):
    """Accepts provider JSON while omitting unknown properties returned as null."""

    async def run(
        self,
        chunks: TextChunks,
        document_info: Optional[DocumentInfo] = None,
        lexical_graph_config: Optional[LexicalGraphConfig] = None,
        schema: Optional[GraphSchema] = None,
        examples: str = "",
        **kwargs: Any,
    ) -> Neo4jGraph:
        return await super().run(
            chunks=chunks,
            document_info=document_info,
            lexical_graph_config=lexical_graph_config,
            schema=schema,
            examples=examples,
            **kwargs,
        )

    async def extract_for_chunk(
        self,
        schema: GraphSchema,
        examples: str,
        chunk: TextChunk,
    ) -> Neo4jGraph:
        prompt = self.prompt_template.format(
            text=chunk.text,
            schema=schema.model_dump(exclude_none=True),
            examples=examples,
        )
        prompt += (
            "\n\nКритически важно: не возвращай свойства со значением null. "
            "Если значение неизвестно, полностью пропусти соответствующее свойство.\n"
            "Создавай Experiment только для реально выполненного испытания, расчёта "
            "или верификации, где присутствуют действие и наблюдаемый результат. "
            "Упоминание чужого исследования или статьи является Publication, а не Experiment.\n"
            "Программные комплексы и САПР классифицируй как Equipment; методики и "
            "алгоритмы — как Technology; выполняемые операции — как Process.\n"
            "Geography создавай только для конкретного места. Формулировки вроде "
            "«сейсмоактивные районы» сохраняй как область применения, а не Geography.\n"
            "Маркер [N] сам по себе не является публикацией. Строка [REFERENCE N] "
            "содержит полное описание Publication: сохрани N в citation_number.\n"
            "Фразы «в статье представлено», «статья содержит рекомендации» и их "
            "английские аналоги относятся к текущему документу и не создают новую Publication.\n"
            "Не создавай перевод сущности как отдельную сущность, если в тексте уже "
            "есть её эквивалент на другом языке.\n"
            "Поле properties каждой сущности должно быть JSON-объектом, где каждое "
            "значение — строка, число или boolean. Никогда не помещай объект "
            "{\"name\": ..., \"value\": ...} внутрь properties. Например, используй "
            "{\"properties\": {\"elastic_modulus\": \"10^10 Па\"}}, а не "
            "{\"properties\": {\"property\": {\"name\": \"Модуль упругости\", "
            "\"value\": \"10^10 Па\"}}}."
        )
        chunk_id = str(
            getattr(chunk, "uid", None)
            or getattr(chunk, "id", None)
            or "unknown"
        )
        max_attempts = 3
        last_error = "неизвестная ошибка"

        for attempt in range(1, max_attempts + 1):
            attempt_prompt = prompt
            if attempt > 1:
                attempt_prompt += (
                    "\n\nПредыдущий ответ не удалось прочитать. Верни только один "
                    "непустой валидный JSON-объект требуемой схемы, без Markdown "
                    "и без пояснений."
                )
            try:
                llm_result = await self.llm.ainvoke(attempt_prompt)
                content = (llm_result.content or "").strip()
                if not content:
                    raise LLMGenerationError("LLM returned an empty response")
                repaired = fix_invalid_json(content)
                result = normalize_graph_payload(
                    remove_null_values(json.loads(repaired))
                )
                graph = Neo4jGraph.model_validate(result)
                successful_chunk_ids = getattr(
                    self,
                    "successful_chunk_ids",
                    None,
                )
                if successful_chunk_ids is None:
                    successful_chunk_ids = []
                    self.successful_chunk_ids = successful_chunk_ids
                successful_chunk_ids.append(chunk_id)
                return graph
            except asyncio.CancelledError:
                raise
            except (
                json.JSONDecodeError,
                InvalidJSONError,
                ValidationError,
                LLMGenerationError,
            ) as exception:
                last_error = str(exception) or exception.__class__.__name__
                logger.warning(
                    "Graph extraction attempt %s/%s failed for chunk %s: %s",
                    attempt,
                    max_attempts,
                    chunk_id,
                    last_error,
                )
                if attempt < max_attempts:
                    await asyncio.sleep(attempt)

        skipped_chunks = getattr(self, "skipped_chunks", None)
        if skipped_chunks is None:
            skipped_chunks = []
            self.skipped_chunks = skipped_chunks
        skipped_chunks.append(
            f"Фрагмент {chunk_id} пропущен после {max_attempts} попыток: "
            f"{last_error}."
        )
        return Neo4jGraph()


def remove_null_values(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            key: remove_null_values(item)
            for key, item in value.items()
            if item is not None
        }
    if isinstance(value, list):
        return [
            remove_null_values(item)
            for item in value
            if item is not None
        ]
    return value


def normalize_graph_payload(value: Any) -> Any:
    """Coerces provider variations into the scalar Neo4jGraph property model."""
    if not isinstance(value, dict):
        return value
    for collection_name in ("nodes", "relationships"):
        collection = value.get(collection_name)
        if not isinstance(collection, list):
            continue
        for item in collection:
            if not isinstance(item, dict) or "properties" not in item:
                continue
            item["properties"] = normalize_properties(item["properties"])
    return value


def normalize_properties(value: Any) -> dict[str, Any]:
    if value is None:
        return {}
    if isinstance(value, list):
        result: dict[str, Any] = {}
        for index, item in enumerate(value, start=1):
            merge_property_item(result, f"property_{index}", item)
        return result
    if not isinstance(value, dict):
        return {"value": scalar_property_value(value)}

    result: dict[str, Any] = {}
    for key, item in value.items():
        merge_property_item(result, str(key), item)
    return result


def merge_property_item(
    target: dict[str, Any],
    fallback_key: str,
    value: Any,
) -> None:
    if isinstance(value, dict):
        property_name = value.get("name")
        property_value = value.get("value")
        if property_name is not None and property_value is not None:
            base_key = property_key(str(property_name), fallback_key)
            target[base_key] = scalar_property_value(property_value)
            for nested_key, nested_value in value.items():
                if nested_key in {"name", "value"} or nested_value is None:
                    continue
                target[f"{base_key}_{property_key(str(nested_key), 'detail')}"] = (
                    scalar_property_value(nested_value)
                )
            return
        target[property_key(fallback_key, "property")] = json.dumps(
            value,
            ensure_ascii=False,
            sort_keys=True,
        )
        return
    target[property_key(fallback_key, "property")] = scalar_property_value(value)


def scalar_property_value(value: Any) -> Any:
    if isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, list) and all(
        isinstance(item, (str, int, float, bool))
        for item in value
    ):
        return value
    return json.dumps(value, ensure_ascii=False, sort_keys=True)


def property_key(value: str, fallback: str) -> str:
    normalized = re.sub(
        r"[^\w]+",
        "_",
        value.strip().lower(),
        flags=re.UNICODE,
    ).strip("_")
    return normalized or fallback
