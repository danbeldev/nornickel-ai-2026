import re


SYNONYM_GROUPS = {
    "электроэкстракция": {
        "электроэкстракция",
        "electrowinning",
        "electroextraction",
    },
    "печь взвешенной плавки": {
        "печь взвешенной плавки",
        "пвп",
        "flash smelting furnace",
    },
    "кучное выщелачивание": {
        "кучное выщелачивание",
        "heap leaching",
    },
    "металлы платиновой группы": {
        "металлы платиновой группы",
        "мпг",
        "platinum group metals",
        "pgm",
    },
    "диоксид серы": {
        "диоксид серы",
        "so2",
        "so₂",
        "sulfur dioxide",
    },
}


def normalize_term(value: str) -> str:
    return re.sub(r"[^a-zа-яё0-9%]+", " ", value.lower()).strip()


CANONICAL_BY_ALIAS = {
    normalize_term(alias): normalize_term(canonical)
    for canonical, aliases in SYNONYM_GROUPS.items()
    for alias in aliases
}


def canonicalize(value: str) -> str:
    normalized = normalize_term(value)
    return CANONICAL_BY_ALIAS.get(normalized, normalized)


def expand_query(value: str) -> str:
    normalized = normalize_term(value)
    additions: list[str] = []
    for canonical, aliases in SYNONYM_GROUPS.items():
        normalized_aliases = {normalize_term(alias) for alias in aliases}
        if any(alias and alias in normalized for alias in normalized_aliases):
            additions.extend([canonical, *sorted(aliases)])
    return value if not additions else value + " " + " ".join(dict.fromkeys(additions))
