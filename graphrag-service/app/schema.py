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
            string_property("severity"),
            string_property("recommendation"),
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
]

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
}

LABEL_BY_ENTITY_TYPE = {
    value: key for key, value in ENTITY_TYPE_BY_LABEL.items()
}
