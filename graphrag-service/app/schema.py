from neo4j_graphrag.experimental.components.schema import (
    NodeType,
    PropertyType,
    RelationshipType,
)


def string_property(name: str) -> PropertyType:
    return PropertyType(name=name, type="STRING")


NODE_TYPES = [
    NodeType(
        label="Material",
        description="Сплав, металл, порошок, образец или другой исследуемый материал",
        additional_properties=True,
        properties=[
            string_property("name"),
            string_property("category"),
            string_property("composition"),
            string_property("aliases"),
        ],
    ),
    NodeType(
        label="Experiment",
        description="Проведенный эксперимент, испытание или экспериментальная серия",
        additional_properties=True,
        properties=[
            string_property("name"),
            string_property("date"),
            string_property("temperature"),
            string_property("duration"),
            string_property("cooling_method"),
            string_property("result"),
        ],
    ),
    NodeType(
        label="Property",
        description="Измеряемое или изменяемое свойство материала",
        additional_properties=True,
        properties=[
            string_property("name"),
            string_property("value_before"),
            string_property("value_after"),
            string_property("unit"),
            string_property("effect"),
        ],
    ),
    NodeType(
        label="Regime",
        description="Режим обработки или условия проведения эксперимента",
        additional_properties=True,
        properties=[
            string_property("name"),
            string_property("temperature"),
            string_property("duration"),
            string_property("cooling_method"),
            string_property("pressure"),
        ],
    ),
    NodeType(
        label="Equipment",
        description="Установка, печь, измерительный прибор или другое оборудование",
        additional_properties=True,
        properties=[string_property("name"), string_property("model")],
    ),
    NodeType(
        label="Team",
        description="Исследовательская группа, лаборатория или организация",
        additional_properties=True,
        properties=[string_property("name")],
    ),
    NodeType(
        label="Conclusion",
        description="Научный вывод или интерпретация результатов",
        additional_properties=True,
        properties=[string_property("name"), string_property("statement")],
    ),
    NodeType(
        label="DataIssue",
        description="Пробел, противоречие, несовместимость или недостаток данных",
        additional_properties=True,
        properties=[
            string_property("name"),
            string_property("issue_type"),
            string_property("description"),
            string_property("severity"),
            string_property("recommendation"),
        ],
    ),
    NodeType(
        label="Process",
        description="Технологический или исследовательский процесс: выщелачивание, электроэкстракция, плавка, очистка",
        additional_properties=True,
        properties=[
            string_property("name"),
            string_property("domain"),
            string_property("conditions"),
            string_property("output"),
        ],
    ),
    NodeType(
        label="Publication",
        description="Научная статья, патент, диссертация, обзор, стандарт или технический отчёт",
        additional_properties=True,
        properties=[
            string_property("name"),
            string_property("publication_type"),
            string_property("year"),
            string_property("language"),
            string_property("country"),
            string_property("authors"),
        ],
    ),
    NodeType(
        label="Expert",
        description="Автор, исследователь или эксперт с предметной компетенцией",
        additional_properties=True,
        properties=[
            string_property("name"),
            string_property("organization"),
            string_property("expertise"),
        ],
    ),
    NodeType(
        label="Facility",
        description="Промышленная площадка, предприятие, фабрика, рудник или лабораторная установка",
        additional_properties=True,
        properties=[
            string_property("name"),
            string_property("facility_type"),
            string_property("country"),
            string_property("region"),
        ],
    ),
    NodeType(
        label="Technology",
        description="Техническое решение, метод, конструкция или технологическая схема",
        additional_properties=True,
        properties=[
            string_property("name"),
            string_property("application"),
            string_property("maturity"),
            string_property("limitations"),
        ],
    ),
    NodeType(
        label="Geography",
        description="Страна, регион или географическая категория применения знания",
        additional_properties=True,
        properties=[
            string_property("name"),
            string_property("country"),
            string_property("region"),
            string_property("scope"),
        ],
    ),
    NodeType(
        label="EconomicIndicator",
        description="Капитальные, операционные или иные технико-экономические показатели",
        additional_properties=True,
        properties=[
            string_property("name"),
            string_property("value"),
            string_property("unit"),
            string_property("currency"),
            string_property("period"),
        ],
    ),
    NodeType(
        label="Unclassified",
        description="Важная сущность, не попавшая в остальные фиксированные типы",
        additional_properties=True,
        properties=[string_property("name"), string_property("context")],
    ),
]

RELATIONSHIP_TYPES = [
    RelationshipType(label="USES_MATERIAL"),
    RelationshipType(label="USES_REGIME"),
    RelationshipType(label="AFFECTS"),
    RelationshipType(label="MEASURES"),
    RelationshipType(label="USES_EQUIPMENT"),
    RelationshipType(label="PERFORMED_BY"),
    RelationshipType(label="PRODUCES_CONCLUSION"),
    RelationshipType(label="BASED_ON"),
    RelationshipType(label="RELATED_TO"),
    RelationshipType(label="COMPARED_WITH"),
    RelationshipType(label="USES"),
    RelationshipType(label="USES_PROCESS"),
    RelationshipType(label="DESCRIBED_IN"),
    RelationshipType(label="DESCRIBES"),
    RelationshipType(label="AUTHORED_BY"),
    RelationshipType(label="EXPERT_IN"),
    RelationshipType(label="AFFILIATED_WITH"),
    RelationshipType(label="LOCATED_IN"),
    RelationshipType(label="IMPLEMENTED_AT"),
    RelationshipType(label="APPLIES_TO"),
    RelationshipType(label="PRODUCES_OUTPUT"),
    RelationshipType(label="VALIDATED_BY"),
    RelationshipType(label="HAS_ECONOMIC_INDICATOR"),
    RelationshipType(label="CONTRADICTS"),
]

PATTERNS = [
    ("Experiment", "USES_MATERIAL", "Material"),
    ("Experiment", "USES_REGIME", "Regime"),
    ("Experiment", "AFFECTS", "Property"),
    ("Experiment", "MEASURES", "Property"),
    ("Experiment", "USES_EQUIPMENT", "Equipment"),
    ("Experiment", "PERFORMED_BY", "Team"),
    ("Experiment", "PRODUCES_CONCLUSION", "Conclusion"),
    ("Conclusion", "BASED_ON", "Experiment"),
    ("DataIssue", "RELATED_TO", "Material"),
    ("DataIssue", "RELATED_TO", "Experiment"),
    ("DataIssue", "RELATED_TO", "Property"),
    ("Material", "COMPARED_WITH", "Material"),
    ("Experiment", "USES", "Unclassified"),
    ("Experiment", "USES_PROCESS", "Process"),
    ("Experiment", "LOCATED_IN", "Geography"),
    ("Experiment", "IMPLEMENTED_AT", "Facility"),
    ("Experiment", "DESCRIBED_IN", "Publication"),
    ("Experiment", "HAS_ECONOMIC_INDICATOR", "EconomicIndicator"),
    ("Process", "USES_MATERIAL", "Material"),
    ("Process", "USES_EQUIPMENT", "Equipment"),
    ("Process", "PRODUCES_OUTPUT", "Material"),
    ("Process", "LOCATED_IN", "Geography"),
    ("Process", "DESCRIBED_IN", "Publication"),
    ("Process", "HAS_ECONOMIC_INDICATOR", "EconomicIndicator"),
    ("Technology", "APPLIES_TO", "Material"),
    ("Technology", "USES_PROCESS", "Process"),
    ("Technology", "USES_EQUIPMENT", "Equipment"),
    ("Technology", "IMPLEMENTED_AT", "Facility"),
    ("Technology", "LOCATED_IN", "Geography"),
    ("Technology", "DESCRIBED_IN", "Publication"),
    ("Technology", "VALIDATED_BY", "Experiment"),
    ("Technology", "HAS_ECONOMIC_INDICATOR", "EconomicIndicator"),
    ("Publication", "AUTHORED_BY", "Expert"),
    ("Publication", "DESCRIBES", "Process"),
    ("Publication", "DESCRIBES", "Technology"),
    ("Publication", "DESCRIBES", "Experiment"),
    ("Expert", "EXPERT_IN", "Process"),
    ("Expert", "EXPERT_IN", "Technology"),
    ("Expert", "AFFILIATED_WITH", "Team"),
    ("Team", "LOCATED_IN", "Geography"),
    ("Facility", "LOCATED_IN", "Geography"),
    ("Conclusion", "VALIDATED_BY", "Publication"),
    ("Conclusion", "CONTRADICTS", "Conclusion"),
    ("DataIssue", "RELATED_TO", "Process"),
    ("DataIssue", "RELATED_TO", "Technology"),
    ("DataIssue", "RELATED_TO", "Publication"),
]

ALLOWED_RELATION_PATTERNS = set(PATTERNS)

RELATIONSHIP_ALIASES = {
    "USING_REGIME": "USES_REGIME",
    "USED_REGIME": "USES_REGIME",
    "APPLIES_REGIME": "USES_REGIME",
    "USER_MATERIAL": "USES_MATERIAL",
    "USING_MATERIAL": "USES_MATERIAL",
    "USED_MATERIAL": "USES_MATERIAL",
    "MEASURED": "MEASURES",
    "USES_DEVICE": "USES_EQUIPMENT",
    "USES_INSTRUMENT": "USES_EQUIPMENT",
    "PERFORMED_WITH": "USES_EQUIPMENT",
    "USES_METHOD": "USES_PROCESS",
    "APPLIES_PROCESS": "USES_PROCESS",
    "HAS_LOCATION": "LOCATED_IN",
    "CONDUCTED_IN": "LOCATED_IN",
    "PUBLISHED_IN": "DESCRIBED_IN",
    "HAS_COST": "HAS_ECONOMIC_INDICATOR",
}

CONTEXTUAL_RELATION_REPAIRS = {
    ("Experiment", "MEASURES", "Equipment"): "USES_EQUIPMENT",
    ("Experiment", "USES", "Material"): "USES_MATERIAL",
    ("Experiment", "USES", "Regime"): "USES_REGIME",
    ("Experiment", "USES", "Equipment"): "USES_EQUIPMENT",
    ("Experiment", "USES", "Process"): "USES_PROCESS",
}


def normalize_relationship_type(value: str) -> str:
    normalized = "".join(
        character if character.isalnum() else "_"
        for character in value.upper()
    ).strip("_")
    return RELATIONSHIP_ALIASES.get(normalized, normalized)


def validate_relationship(
    source_label: str,
    relationship_type: str,
    target_label: str,
) -> str | None:
    normalized = normalize_relationship_type(relationship_type)
    repaired = CONTEXTUAL_RELATION_REPAIRS.get(
        (source_label, normalized, target_label),
        normalized,
    )
    if (source_label, repaired, target_label) in ALLOWED_RELATION_PATTERNS:
        return repaired
    return None


SCHEMA_INPUT = {
    "node_types": NODE_TYPES,
    "relationship_types": RELATIONSHIP_TYPES,
    "patterns": PATTERNS,
}

ENTITY_TYPE_BY_LABEL = {
    "Material": "material",
    "Experiment": "experiment",
    "Property": "property",
    "Regime": "regime",
    "Equipment": "equipment",
    "Team": "team",
    "Conclusion": "conclusion",
    "DataIssue": "data_issue",
    "Unclassified": "unclassified",
    "Process": "process",
    "Publication": "publication",
    "Expert": "expert",
    "Facility": "facility",
    "Technology": "technology",
    "Geography": "geography",
    "EconomicIndicator": "economic_indicator",
}

LABEL_BY_ENTITY_TYPE = {
    value: key for key, value in ENTITY_TYPE_BY_LABEL.items()
}
