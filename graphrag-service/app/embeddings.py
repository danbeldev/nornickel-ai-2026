from typing import Any

import httpx
from neo4j_graphrag.embeddings.base import Embedder
from neo4j_graphrag.exceptions import EmbeddingsGenerationError
from neo4j_graphrag.utils.rate_limit import (
    async_rate_limit_handler,
    rate_limit_handler,
)


class YandexEmbeddings(Embedder):
    """Neo4j GraphRAG embedder backed by the native Yandex Embeddings API."""

    def __init__(
        self,
        api_key: str,
        model: str,
        base_url: str,
        timeout_seconds: float = 60.0,
    ) -> None:
        super().__init__()
        self._model = model
        self._base_url = base_url
        self._headers = {
            "Authorization": f"Api-Key {api_key}",
            "Content-Type": "application/json",
        }
        self._client = httpx.Client(
            headers=self._headers,
            timeout=timeout_seconds,
        )
        self._async_client = httpx.AsyncClient(
            headers=self._headers,
            timeout=timeout_seconds,
        )

    @rate_limit_handler
    def embed_query(self, text: str) -> list[float]:
        try:
            response = self._client.post(self._base_url, json=self._request(text))
            response.raise_for_status()
            return self._embedding(response.json())
        except httpx.HTTPStatusError as exception:
            raise EmbeddingsGenerationError(
                "Failed to generate embedding with Yandex: "
                f"HTTP {exception.response.status_code}: "
                f"{exception.response.text[:1000]}"
            ) from exception
        except Exception as exception:
            raise EmbeddingsGenerationError(
                f"Failed to generate embedding with Yandex: {exception}"
            ) from exception

    @async_rate_limit_handler
    async def async_embed_query(self, text: str) -> list[float]:
        try:
            response = await self._async_client.post(
                self._base_url,
                json=self._request(text),
            )
            response.raise_for_status()
            return self._embedding(response.json())
        except httpx.HTTPStatusError as exception:
            raise EmbeddingsGenerationError(
                "Failed to generate embedding with Yandex: "
                f"HTTP {exception.response.status_code}: "
                f"{exception.response.text[:1000]}"
            ) from exception
        except Exception as exception:
            raise EmbeddingsGenerationError(
                f"Failed to generate embedding with Yandex: {exception}"
            ) from exception

    def _request(self, text: str) -> dict[str, str]:
        return {
            "modelUri": self._model,
            "text": text,
        }

    @staticmethod
    def _embedding(payload: dict[str, Any]) -> list[float]:
        embedding = payload.get("embedding")
        if not isinstance(embedding, list) or not embedding:
            raise ValueError("Yandex returned an empty embedding")
        return [float(value) for value in embedding]
