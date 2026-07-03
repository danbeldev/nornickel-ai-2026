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
    "cae fidesys": {
        "cae fidesys",
        "программный комплекс cae fidesys",
        "отечественный программный комплекс cae fidesys",
    },
    "метод конечных элементов": {
        "метод конечных элементов",
        "метод конечных элементов мкэ",
        "мкэ",
        "finite element method",
        "fem",
    },
    "численное моделирование тектонических нарушений": {
        "численное моделирование тектонических нарушений",
        "numerical modeling of tectonic faults",
        "numerical modelling of tectonic faults",
    },
    "связи конечной жесткости": {
        "связи конечной жесткости",
        "связи конечной жёсткости",
        "finite stiffness links",
    },
    "верификация разработанного инструмента": {
        "верификация разработанного инструмента",
        "testing the developed tool",
    },
    "горные породы": {
        "горные породы",
        "породы",
        "rock masses",
        "rocks",
    },
}


def normalize_term(value: str) -> str:
    return re.sub(
        r"[^a-zа-я0-9%]+",
        " ",
        value.lower().replace("ё", "е"),
    ).strip()


CANONICAL_BY_ALIAS = {
    normalize_term(alias): normalize_term(canonical)
    for canonical, aliases in SYNONYM_GROUPS.items()
    for alias in aliases
}


def canonicalize(value: str) -> str:
    normalized = normalize_term(value)
    exact = CANONICAL_BY_ALIAS.get(normalized)
    if exact:
        return exact
    if (
        re.search(r"(?:метод|методика|подход)", normalized)
        and re.search(r"(?:моделирован|задани)", normalized)
        and "тектоническ" in normalized
        and (
            "конечной жесткости" in normalized
            or "пружин" in normalized
        )
    ):
        return (
            "методика моделирования тектонических нарушений "
            "связями конечной жесткости"
        )
    if (
        re.search(r"(?:моделирован|задани|применени)", normalized)
        and "тектоническ" in normalized
        and (
            "конечной жесткости" in normalized
            or "пружин" in normalized
        )
    ):
        return (
            "моделирование тектонических нарушений "
            "связями конечной жесткости"
        )
    return normalized


def expand_query(value: str) -> str:
    normalized = normalize_term(value)
    additions: list[str] = []
    for canonical, aliases in SYNONYM_GROUPS.items():
        normalized_aliases = {normalize_term(alias) for alias in aliases}
        if any(alias and alias in normalized for alias in normalized_aliases):
            additions.extend([canonical, *sorted(aliases)])
    return value if not additions else value + " " + " ".join(dict.fromkeys(additions))
