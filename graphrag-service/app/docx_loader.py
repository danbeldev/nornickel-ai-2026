import re
from collections.abc import Iterable
from pathlib import Path

from docx import Document as DocxDocument
from docx.oxml.ns import qn
from docx.oxml.table import CT_Tbl
from docx.oxml.text.paragraph import CT_P
from docx.table import Table
from docx.text.paragraph import Paragraph

from .models import SourcePage


PAGE_BREAK = "\u000c"
REFERENCE_SECTION = re.compile(
    r"(?iu)(список\s+использованных\s+источников|"
    r"список\s+литературы|references|bibliography)"
)
HEADING_STYLE = re.compile(r"(?iu)(heading|заголовок)")
GENERIC_IMAGE_NAME = re.compile(r"(?iu)^(picture|image|рисунок)\s*\d*$")


def load_docx_pages(path: Path) -> list[SourcePage]:
    document = DocxDocument(str(path))
    page = 1
    current_section = "Документ"
    reference_number = 0
    saw_russian_abstract = False
    skip_translated_abstract = False
    result: list[SourcePage] = []

    def append(text: str, section: str) -> None:
        normalized = normalize_text(text)
        if not normalized:
            return
        if result and result[-1].page == page and result[-1].section == section:
            result[-1].text += "\n" + normalized
        else:
            result.append(
                SourcePage(page=page, text=normalized, section=section)
            )

    def advance_page() -> None:
        nonlocal page
        page += 1

    for child in document.element.body.iterchildren():
        if isinstance(child, CT_P):
            paragraph = Paragraph(child, document)
            raw_text = extract_xml_text(child)
            style = paragraph.style.name if paragraph.style is not None else ""
            plain_text = normalize_text(raw_text.replace(PAGE_BREAK, " "))
            normalized_marker = plain_text.casefold().strip(" .:")
            if normalized_marker == "аннотация":
                current_section = "Аннотация"
                saw_russian_abstract = True
                skip_translated_abstract = False
            elif normalized_marker == "abstract":
                current_section = "Abstract"
                skip_translated_abstract = saw_russian_abstract
            elif plain_text and HEADING_STYLE.search(style):
                current_section = plain_text
                skip_translated_abstract = False

            is_reference = bool(REFERENCE_SECTION.search(current_section))
            is_reference_entry = (
                is_reference
                and bool(plain_text)
                and not REFERENCE_SECTION.fullmatch(plain_text)
            )
            reference_label: int | None = None
            if is_reference_entry:
                reference_number += 1
                reference_label = reference_number
            segments = raw_text.split(PAGE_BREAK)
            for index, segment in enumerate(segments):
                segment = add_image_descriptions(segment, child)
                normalized = normalize_text(segment)
                if normalized and not skip_translated_abstract:
                    if reference_label is not None:
                        continuation = " CONTINUED" if index > 0 else ""
                        normalized = (
                            f"[REFERENCE {reference_label}{continuation}] "
                            f"{normalized}"
                        )
                    append(normalized, current_section)
                if index < len(segments) - 1:
                    advance_page()
            continue

        if isinstance(child, CT_Tbl):
            table = Table(child, document)
            for row in table.rows:
                cells = [
                    normalize_text(extract_xml_text(cell._tc).replace(PAGE_BREAK, " "))
                    for cell in row.cells
                ]
                row_text = " | ".join(cell for cell in cells if cell)
                if row_text:
                    append(f"[Таблица] {row_text}", current_section)

    return result


def extract_xml_text(element: object) -> str:
    tokens: list[str] = []

    def walk(node: object) -> None:
        tag = getattr(node, "tag", "")
        local_name = tag.rsplit("}", 1)[-1] if isinstance(tag, str) else ""
        if local_name == "lastRenderedPageBreak":
            tokens.append(PAGE_BREAK)
            return
        if local_name == "br":
            break_type = getattr(node, "get")(qn("w:type"))
            tokens.append(PAGE_BREAK if break_type == "page" else "\n")
            return
        if local_name == "tab":
            tokens.append("\t")
            return
        if local_name == "t":
            tokens.append(getattr(node, "text", "") or "")
            return
        for child in getattr(node, "iterchildren")():
            walk(child)

    walk(element)
    return "".join(tokens)


def add_image_descriptions(text: str, element: object) -> str:
    descriptions: list[str] = []
    for node in getattr(element, "xpath")(".//*[local-name()='docPr']"):
        description = (
            node.get("descr")
            or node.get("title")
            or node.get("name")
            or ""
        ).strip()
        if description and not GENERIC_IMAGE_NAME.fullmatch(description):
            descriptions.append(description)
    if not descriptions:
        return text
    suffix = " ".join(f"[Изображение: {item}]" for item in descriptions)
    return f"{text} {suffix}".strip()


def normalize_text(value: str) -> str:
    lines: Iterable[str] = value.replace("\u00a0", " ").splitlines()
    return "\n".join(
        normalized
        for line in lines
        if (normalized := re.sub(r"[ \t]+", " ", line).strip())
    )
