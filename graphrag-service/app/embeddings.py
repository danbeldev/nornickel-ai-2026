import asyncio
import threading
import time
from typing import Any

import httpx
from neo4j_graphrag.embeddings.base import Embedder
from neo4j_graphrag.exceptions import EmbeddingsGenerationError
from neo4j_graphrag.utils.rate_limit import (
    async_rate_limit_handler,
    rate_limit_handler,
)

from .token_usage import record_usage


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
        # Yandex Embeddings commonly allows 10 requests per second. Keep a
        # small safety margin instead of relying on 429 retries.
        self._minimum_interval_seconds = 0.12
        self._sync_lock = threading.Lock()
        self._async_lock = asyncio.Lock()
        self._last_sync_request_at = 0.0
        self._last_async_request_at = 0.0

    @rate_limit_handler
    def embed_query(self, text: str) -> list[float]:
        try:
            with self._sync_lock:
                delay = self._minimum_interval_seconds - (
                    time.monotonic() - self._last_sync_request_at
                )
                if delay > 0:
                    time.sleep(delay)
                response = self._client.post(
                    self._base_url,
                    json=self._request(text),
                )
                self._last_sync_request_at = time.monotonic()
            response.raise_for_status()
            payload = response.json()
            self._record_usage(payload)
            return self._embedding(payload)
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
            async with self._async_lock:
                delay = self._minimum_interval_seconds - (
                    time.monotonic() - self._last_async_request_at
                )
                if delay > 0:
                    await asyncio.sleep(delay)
                response = await self._async_client.post(
                    self._base_url,
                    json=self._request(text),
                )
                self._last_async_request_at = time.monotonic()
            response.raise_for_status()
            payload = response.json()
            self._record_usage(payload)
            return self._embedding(payload)
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

    def _record_usage(self, payload: dict[str, Any]) -> None:
        token_count = payload.get("numTokens") or payload.get("num_tokens")
        if token_count is not None:
            record_usage(self._model, token_count, 0, token_count)
