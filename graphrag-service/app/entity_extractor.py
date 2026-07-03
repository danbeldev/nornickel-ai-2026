import json
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
            "есть её эквивалент на другом языке."
        )
        llm_result = await self.llm.ainvoke(prompt)

        try:
            repaired = fix_invalid_json(llm_result.content)
            result = remove_null_values(json.loads(repaired))
        except (json.JSONDecodeError, InvalidJSONError) as exception:
            if self.on_error == OnError.RAISE:
                raise LLMGenerationError(
                    "LLM response is not valid JSON"
                ) from exception
            return Neo4jGraph()

        try:
            return Neo4jGraph.model_validate(result)
        except ValidationError as exception:
            if self.on_error == OnError.RAISE:
                raise LLMGenerationError(
                    "LLM response has improper format after null normalization"
                ) from exception
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
