#!/usr/bin/env python3
import os
import re
import json
import tarfile
import shutil
from pathlib import Path
from datetime import datetime, timezone


UUID_RE = re.compile(
    r"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl$",
    re.IGNORECASE,
)


def get_codex_home() -> Path:
    return Path(os.environ.get("CODEX_HOME", Path.home() / ".codex")).expanduser()


def find_latest_archive(history_dir: Path) -> Path | None:
    archives = []
    archives.extend(history_dir.glob("codex-history-*.tar.xz"))
    archives.extend(history_dir.glob("codex-history-*.tar.gz"))
    archives.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    return archives[0] if archives else None


def extract_session_id(path: Path) -> str | None:
    match = UUID_RE.search(path.name)
    return match.group(1) if match else None


def now_utc() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def read_manifest(archive_path: Path) -> dict:
    try:
        with tarfile.open(archive_path, "r:*") as tar:
            member = next((m for m in tar.getmembers() if m.name == "codex_history_manifest.json"), None)
            if not member:
                return {}

            f = tar.extractfile(member)
            if not f:
                return {}

            return json.loads(f.read().decode("utf-8"))
    except Exception:
        return {}


def get_session_members(archive_path: Path) -> list[str]:
    result = []

    with tarfile.open(archive_path, "r:*") as tar:
        for member in tar.getmembers():
            name = member.name.replace("\\", "/")

            if member.isdir():
                continue

            if name.startswith(".codex/sessions/"):
                result.append(name.replace(".codex/", "", 1))
            elif name.startswith("sessions/") and name.endswith(".jsonl"):
                result.append(name)

    return sorted(set(result))


def replace_old_project_path(text: str, old_project_path: str | None, new_project_path: str) -> tuple[str, int]:
    if not old_project_path:
        return text, 0

    old_variants = sorted(
        set([
            old_project_path,
            old_project_path.replace("\\", "/"),
            old_project_path.replace("/", "\\"),
        ]),
        key=len,
        reverse=True,
    )

    new_variants = [
        new_project_path,
        new_project_path.replace("\\", "/"),
    ]

    # В JSON и Codex чаще безопаснее прямые слеши, даже на Windows
    new_value = new_variants[1]

    total = 0

    for old in old_variants:
        if old and old in text:
            count = text.count(old)
            text = text.replace(old, new_value)
            total += count

    return text, total


def build_session_meta_line(session_id: str, timestamp: str, cwd: str) -> str:
    payload = {
        "session_id": session_id,
        "id": session_id,
        "timestamp": timestamp,
        "cwd": cwd.replace("\\", "/"),
        "originator": "codex_cli_rs",
        "cli_version": "imported",
        "source": "cli",
        "model_provider": "openai",
    }

    line = {
        "timestamp": timestamp,
        "type": "session_meta",
        "payload": payload,
    }

    return json.dumps(line, ensure_ascii=False, separators=(",", ":"))


def repair_file(path: Path, current_project_dir: Path, old_project_path: str | None) -> tuple[bool, str]:
    session_id = extract_session_id(path)

    if not session_id:
        return False, "не смог определить session id из имени файла"

    raw_text = path.read_text(encoding="utf-8", errors="ignore")

    # Убираем BOM, если вдруг файл был пересохранен Windows-редактором
    text = raw_text.lstrip("\ufeff")

    text, replacements = replace_old_project_path(
        text=text,
        old_project_path=old_project_path,
        new_project_path=str(current_project_dir),
    )

    lines = text.splitlines()

    if not lines:
        return False, "файл пустой"

    first_line = lines[0].lstrip("\ufeff")

    try:
        first_obj = json.loads(first_line)
    except Exception:
        first_obj = None

    changed = False

    if isinstance(first_obj, dict) and first_obj.get("type") == "session_meta":
        payload = first_obj.setdefault("payload", {})
        payload["session_id"] = payload.get("session_id") or session_id
        payload["id"] = payload.get("id") or session_id
        payload["cwd"] = str(current_project_dir).replace("\\", "/")

        lines[0] = json.dumps(first_obj, ensure_ascii=False, separators=(",", ":"))
        changed = True
        action = "обновил существующий session_meta"
    else:
        timestamp = now_utc()

        if isinstance(first_obj, dict) and first_obj.get("timestamp"):
            timestamp = str(first_obj["timestamp"])

        meta_line = build_session_meta_line(
            session_id=session_id,
            timestamp=timestamp,
            cwd=str(current_project_dir),
        )

        lines.insert(0, meta_line)
        changed = True
        action = "добавил отсутствующий session_meta"

    new_text = "\n".join(lines) + "\n"

    if new_text == raw_text:
        return False, "изменения не требуются"

    backup = path.with_suffix(path.suffix + ".before-session-meta-repair.bak")
    shutil.copy2(path, backup)

    path.write_text(new_text, encoding="utf-8", newline="\n")

    return True, f"{action}; замен путей проекта: {replacements}; backup: {backup}"


def main() -> int:
    script_dir = Path(__file__).resolve().parent
    project_dir = script_dir.parent.resolve()
    history_dir = script_dir / "history"
    codex_home = get_codex_home()

    archive_path = find_latest_archive(history_dir)

    if not archive_path:
        print("Ошибка: не найден архив в ./codex/history/")
        return 1

    manifest = read_manifest(archive_path)
    old_project_path = manifest.get("project_path_on_export_machine")

    print("Текущий проект:")
    print(f"  {project_dir}")
    print()
    print("Codex home:")
    print(f"  {codex_home}")
    print()
    print("Архив:")
    print(f"  {archive_path}")
    print()
    print("Старый путь проекта:")
    print(f"  {old_project_path}")
    print()

    session_members = get_session_members(archive_path)

    if not session_members:
        print("В архиве не найдены sessions/*.jsonl")
        return 1

    repaired_count = 0

    for rel in session_members:
        target = codex_home / rel

        if not target.exists():
            print(f"Пропуск, файл не найден после импорта: {target}")
            continue

        ok, message = repair_file(target, project_dir, old_project_path)

        if ok:
            repaired_count += 1
            print(f"OK: {target}")
            print(f"  {message}")
        else:
            print(f"SKIP: {target}")
            print(f"  {message}")

    print()
    print(f"Готово. Исправлено файлов: {repaired_count}")
    print()
    print("Теперь проверь:")
    print("  codex resume --all")
    print()
    print("Или напрямую:")
    for rel in session_members:
        sid = extract_session_id(Path(rel))
        if sid:
            print(f"  codex resume {sid}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
