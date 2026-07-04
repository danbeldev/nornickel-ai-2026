import asyncio
import logging

import httpx

from .config import settings


logger = logging.getLogger(__name__)


class OperationCanceled(Exception):
    pass


class OperationRegistry:
    def __init__(self) -> None:
        self._active: dict[str, asyncio.Task] = {}
        self._canceled_before_start: set[str] = set()

    def start(self, job_id: str) -> None:
        if job_id in self._canceled_before_start:
            self._canceled_before_start.discard(job_id)
            raise OperationCanceled()
        task = asyncio.current_task()
        if task is not None:
            self._active[job_id] = task

    def finish(self, job_id: str) -> None:
        self._active.pop(job_id, None)
        self._canceled_before_start.discard(job_id)

    def cancel(self, job_id: str) -> bool:
        task = self._active.get(job_id)
        if task is None:
            self._canceled_before_start.add(job_id)
            return False
        task.cancel()
        return True


operations = OperationRegistry()


async def report_progress(job_id: str, progress: int, stage: str) -> None:
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.post(
                f"{settings.spring_api_base_url}/api/jobs/{job_id}/progress",
                json={"progress": progress, "stage": stage},
            )
            response.raise_for_status()
    except Exception as exception:
        logger.warning("Cannot report progress for %s: %s", job_id, exception)


async def report_partial_draft(
    document_id: str,
    draft: dict,
) -> None:
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                (
                    f"{settings.spring_api_base_url}/api/documents/"
                    f"{document_id}/extraction/partial"
                ),
                json=draft,
            )
            response.raise_for_status()
    except Exception as exception:
        logger.warning(
            "Cannot report partial draft for %s: %s",
            document_id,
            exception,
        )
