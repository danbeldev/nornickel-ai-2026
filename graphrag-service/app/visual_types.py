from dataclasses import dataclass


@dataclass(slots=True)
class VisualCandidate:
    kind: str
    page: int
    section: str
    title: str
    text: str = ""
    image: bytes | None = None
    content_type: str | None = None
