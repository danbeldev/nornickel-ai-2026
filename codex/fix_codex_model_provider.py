#!/usr/bin/env python3
import os
import re
import json
import tarfile
import shutil
from pathlib import Path


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


def get_session_members_from_archive(archive_path: Path) -> list[str]:
    result = []

    with tarfile.open(archive_path, "r:*") as tar:
        for member in tar.getmembers():
            name = member.name.replace("\\", "/")

            if member.isdir():
                continue

            if name.startswith(".codex/sessions/") and name.endswith(".jsonl"):
                result.append(name.replace(".codex/", "", 1))
            elif name.startswith("sessions/") and name.endswith(".jsonl"):
                result.append(name)

    return sorted(set(result))


def extract_session_id(path: Path) -> str | None:
    match = UUID_RE.search(path.name)
    return match.group(1) if match else None


def fix_file(path: Path) -> tuple[bool, str]:
    raw_text = path.read_text(encoding="utf-8-sig", errors="ignore")
    lines = raw_text.splitlines()

    if not lines:
        return False, "файл пустой"

    try:
        first = json.loads(lines[0].lstrip("\ufeff"))
    except Exception as e:
        return False, f"не удалось прочитать первую JSON-строку: {e}"

    if first.get("type") != "session_meta":
        return False, "первая строка не session_meta"

    payload = first.get("payload")
    if not isinstance(payload, dict):
        return False, "payload в session_meta не объект"

    changed = False

    # Главная правка
    if not payload.get("model_provider"):
        payload["model_provider"] = "openai"
        changed = True

    # На всякий случай, если provider лежит не только в payload
    if first.get("model_provider") == "":
        first["model_provider"] = "openai"
        changed = True

    # Иногда внутри payload может быть вложенный config
    config = payload.get("config")
    if isinstance(config, dict):
        if config.get("model_provider") == "":
            config["model_provider"] = "openai"
            changed = True

    if not changed:
        return False, f"model_provider уже задан: {payload.get('model_provider')}"

    backup = path.with_suffix(path.suffix + ".provider-fix.bak")
    shutil.copy2(path, backup)

    lines[0] = json.dumps(first, ensure_ascii=False, separators=(",", ":"))
    path.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")

    return True, f"model_provider установлен в openai; backup: {backup}"


def main() -> int:
    script_dir = Path(__file__).resolve().parent
    history_dir = script_dir / "history"
    codex_home = get_codex_home()

    archive_path = find_latest_archive(history_dir)

    if not archive_path:
        print("Ошибка: не найден архив в ./codex/history/")
        return 1

    session_members = get_session_members_from_archive(archive_path)

    if not session_members:
        print("В архиве не найдены sessions/*.jsonl")
        return 1

    print("Codex home:")
    print(f"  {codex_home}")
    print()
    print("Архив:")
    print(f"  {archive_path}")
    print()

    fixed = 0

    for rel in session_members:
        target = codex_home / rel

        if not target.exists():
            print(f"SKIP: файл не найден: {target}")
            continue

        ok, msg = fix_file(target)

        if ok:
            fixed += 1
            print(f"OK: {target}")
            print(f"  {msg}")
        else:
            print(f"SKIP: {target}")
            print(f"  {msg}")

    print()
    print(f"Готово. Исправлено файлов: {fixed}")
    print()
    print("Пробуй открыть:")
    for rel in session_members:
        sid = extract_session_id(Path(rel))
        if sid:
            print(f"  codex resume {sid}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
