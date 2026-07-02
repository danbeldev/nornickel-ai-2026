import re


UNIT_CONVERSIONS: dict[str, tuple[str, float]] = {
    "мг/л": ("mg/L", 1.0),
    "мг/дм3": ("mg/L", 1.0),
    "мг/дм³": ("mg/L", 1.0),
    "mg/l": ("mg/L", 1.0),
    "г/л": ("mg/L", 1000.0),
    "g/l": ("mg/L", 1000.0),
    "кг/м3": ("mg/L", 1000.0),
    "kg/m3": ("mg/L", 1000.0),
    "°c": ("°C", 1.0),
    "c": ("°C", 1.0),
    "мпа": ("MPa", 1.0),
    "mpa": ("MPa", 1.0),
    "кпа": ("MPa", 0.001),
    "kpa": ("MPa", 0.001),
    "па": ("MPa", 0.000001),
    "pa": ("MPa", 0.000001),
    "ч": ("h", 1.0),
    "час": ("h", 1.0),
    "часа": ("h", 1.0),
    "часов": ("h", 1.0),
    "h": ("h", 1.0),
    "мин": ("h", 1 / 60),
    "min": ("h", 1 / 60),
    "%": ("%", 1.0),
}


def normalize_unit(value: str | None) -> tuple[str | None, float]:
    if not value:
        return None, 1.0
    normalized = re.sub(r"\s+", "", value.lower())
    return UNIT_CONVERSIONS.get(normalized, (value.strip(), 1.0))
