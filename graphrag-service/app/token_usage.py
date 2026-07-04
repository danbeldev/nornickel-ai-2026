from contextvars import ContextVar, Token
from dataclasses import dataclass, field
from typing import Any


@dataclass
class TokenUsage:
    models: dict[str, "ModelUsage"] = field(default_factory=dict)

    def add(
        self,
        model: str,
        prompt_tokens: Any = None,
        completion_tokens: Any = None,
        total_tokens: Any = None,
    ) -> None:
        if not model:
            return
        usage = self.models.setdefault(model, ModelUsage())
        prompt = positive_int(prompt_tokens)
        completion = positive_int(completion_tokens)
        total = positive_int(total_tokens)
        usage.prompt_tokens += prompt
        usage.completion_tokens += completion
        usage.total_tokens += total or prompt + completion

    def as_list(self) -> list[dict[str, Any]]:
        return [
            {
                "model": model,
                "promptTokens": usage.prompt_tokens,
                "completionTokens": usage.completion_tokens,
                "totalTokens": usage.total_tokens,
            }
            for model, usage in self.models.items()
        ]


@dataclass
class ModelUsage:
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


_current_usage: ContextVar[TokenUsage | None] = ContextVar(
    "document_token_usage",
    default=None,
)


def start_tracking() -> tuple[TokenUsage, Token]:
    usage = TokenUsage()
    return usage, _current_usage.set(usage)


def stop_tracking(token: Token) -> None:
    _current_usage.reset(token)


def record_usage(
    model: str,
    prompt_tokens: Any = None,
    completion_tokens: Any = None,
    total_tokens: Any = None,
) -> None:
    usage = _current_usage.get()
    if usage is not None:
        usage.add(model, prompt_tokens, completion_tokens, total_tokens)


def positive_int(value: Any) -> int:
    try:
        return max(0, int(value or 0))
    except (TypeError, ValueError):
        return 0
