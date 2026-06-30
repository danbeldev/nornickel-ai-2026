#!/usr/bin/env python3
import os
import tarfile
import json
import io
from pathlib import Path
from datetime import datetime


def get_codex_home() -> Path:
    return Path(os.environ.get("CODEX_HOME", Path.home() / ".codex")).expanduser()


def safe_name(name: str) -> str:
    result = []
    for ch in name:
        if ch.isalnum() or ch in "._-":
            result.append(ch)
        elif ch.isspace():
            result.append("-")
    return "".join(result).strip("-") or "project"


def file_contains(path: Path, text: str) -> bool:
    try:
        with path.open("r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                if text in line:
                    return True
    except Exception:
        return False
    return False


def main() -> int:
    script_dir = Path(__file__).resolve().parent
    project_dir = script_dir.parent.resolve()
    project_name = project_dir.name

    history_dir = script_dir / "history"
    history_dir.mkdir(parents=True, exist_ok=True)

    codex_home = get_codex_home()
    sessions_dir = codex_home / "sessions"

    if not sessions_dir.exists():
        print(f"Ошибка: папка сессий Codex не найдена: {sessions_dir}")
        return 1

    print("Проект:")
    print(f"  {project_dir}")
    print()
    print("Папка истории Codex:")
    print(f"  {sessions_dir}")
    print()
    print("Архивы будут сохраняться сюда:")
    print(f"  {history_dir}")
    print()

    all_sessions = list(sessions_dir.rglob("*.jsonl"))

    if not all_sessions:
        print("Сессии Codex не найдены.")
        return 1

    matched = []
    project_path_text = str(project_dir)

    print("Ищу сессии по полному пути проекта...")

    for file in all_sessions:
        if file_contains(file, project_path_text):
            matched.append(file)

    if not matched:
        print("По полному пути ничего не найдено.")
        print(f"Пробую найти по названию проекта: {project_name}")

        for file in all_sessions:
            if file_contains(file, project_name):
                matched.append(file)

    matched = sorted(set(matched))

    if not matched:
        print("История Codex по этому проекту не найдена.")
        return 1

    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    archive_name = f"codex-history-{safe_name(project_name)}-{timestamp}.tar.xz"
    archive_path = history_dir / archive_name

    manifest = {
        "project_name": project_name,
        "project_path_on_export_machine": str(project_dir),
        "codex_home_on_export_machine": str(codex_home),
        "exported_at": datetime.now().isoformat(timespec="seconds"),
        "compression": "tar.xz",
        "compression_level": "xz preset=9",
        "sessions_count": len(matched),
        "sessions": [],
        "note": "This archive contains only Codex session jsonl files, not auth.json or account credentials."
    }

    print()
    print("Найдены сессии:")

    with tarfile.open(archive_path, "w:xz", preset=9) as tar:
        for file in matched:
            rel = file.relative_to(codex_home)
            tar.add(file, arcname=str(rel))
            manifest["sessions"].append(str(rel))
            print(f"  {rel}")

        manifest_bytes = json.dumps(
            manifest,
            ensure_ascii=False,
            indent=2
        ).encode("utf-8")

        info = tarfile.TarInfo("codex_history_manifest.json")
        info.size = len(manifest_bytes)
        tar.addfile(info, io.BytesIO(manifest_bytes))

    print()
    print("Готово. Архив истории создан:")
    print(f"  {archive_path}")
    print()
    print("Размер архива:")
    print(f"  {archive_path.stat().st_size / 1024 / 1024:.2f} MB")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
