#!/usr/bin/env python3
import os
import tarfile
import json
import shutil
from pathlib import Path


def get_codex_home() -> Path:
    return Path(os.environ.get("CODEX_HOME", Path.home() / ".codex")).expanduser()


def is_safe_member_name(name: str) -> bool:
    path = Path(name)

    if path.is_absolute():
        return False

    if ".." in path.parts:
        return False

    return (
        name == "codex_history_manifest.json"
        or name.startswith("sessions/")
        or name.startswith(".codex/sessions/")
    )


def find_latest_archive(history_dir: Path) -> Path | None:
    archives = []
    archives.extend(history_dir.glob("codex-history-*.tar.xz"))
    archives.extend(history_dir.glob("codex-history-*.tar.gz"))

    archives = sorted(
        archives,
        key=lambda p: p.stat().st_mtime,
        reverse=True
    )

    return archives[0] if archives else None


def extract_session_id(filename: str) -> str | None:
    stem = Path(filename).name

    if stem.endswith(".jsonl"):
        stem = stem[:-6]

    parts = stem.split("-")

    if len(parts) >= 5:
        possible = "-".join(parts[-5:])
        groups = possible.split("-")

        if (
            len(groups) == 5
            and len(groups[0]) == 8
            and len(groups[1]) == 4
            and len(groups[2]) == 4
            and len(groups[3]) == 4
            and len(groups[4]) == 12
        ):
            return possible

    return None


def normalize_path_for_json_text(path: Path) -> list[str]:
    """
    Возвращает варианты пути, которые могут встретиться в JSONL.
    На Windows путь может быть с обратными слешами или прямыми.
    """
    raw = str(path)
    return sorted(set([
        raw,
        raw.replace("\\", "/"),
        raw.replace("/", "\\"),
    ]), key=len, reverse=True)


def replace_project_paths(text: str, old_project_path: str | None, current_project_dir: Path) -> tuple[str, int]:
    if not old_project_path:
        return text, 0

    replacements = 0

    old_variants = sorted(set([
        old_project_path,
        old_project_path.replace("\\", "/"),
        old_project_path.replace("/", "\\"),
    ]), key=len, reverse=True)

    new_variants = normalize_path_for_json_text(current_project_dir)
    new_main = new_variants[0]

    for old in old_variants:
        if old and old in text:
            count = text.count(old)
            text = text.replace(old, new_main)
            replacements += count

    return text, replacements


def main() -> int:
    script_dir = Path(__file__).resolve().parent

    # Проект = родительская папка относительно ./codex
    current_project_dir = script_dir.parent.resolve()

    history_dir = script_dir / "history"
    codex_home = get_codex_home()

    if not history_dir.exists():
        print("Ошибка: папка с архивами истории не найдена:")
        print(f"  {history_dir}")
        return 1

    archive_path = find_latest_archive(history_dir)

    if archive_path is None:
        print("Ошибка: архив истории не найден.")
        print()
        print("Ожидаемый путь:")
        print(f"  {history_dir}/codex-history-*.tar.xz")
        print("или старый формат:")
        print(f"  {history_dir}/codex-history-*.tar.gz")
        return 1

    print("Текущий проект:")
    print(f"  {current_project_dir}")
    print()
    print("Найден архив для импорта:")
    print(f"  {archive_path}")
    print()
    print("Импорт будет выполнен в Codex home:")
    print(f"  {codex_home}")
    print()

    codex_home.mkdir(parents=True, exist_ok=True)

    imported = []
    overwritten = []
    path_replacements_total = 0

    old_project_path = None

    with tarfile.open(archive_path, "r:*") as tar:
        members = tar.getmembers()

        for member in members:
            if not is_safe_member_name(member.name):
                print("Ошибка: в архиве найден небезопасный путь:")
                print(f"  {member.name}")
                print("Импорт остановлен.")
                return 1

        manifest_member = next(
            (m for m in members if m.name == "codex_history_manifest.json"),
            None
        )

        if manifest_member:
            try:
                f = tar.extractfile(manifest_member)
                if f:
                    manifest = json.loads(f.read().decode("utf-8"))
                    old_project_path = manifest.get("project_path_on_export_machine")

                    print("Информация об архиве:")
                    print(f"  Проект: {manifest.get('project_name')}")
                    print(f"  Старый путь проекта: {old_project_path}")
                    print(f"  Новый путь проекта: {current_project_dir}")
                    print(f"  Сессий: {manifest.get('sessions_count')}")
                    print(f"  Экспортировано: {manifest.get('exported_at')}")
                    print(f"  Сжатие: {manifest.get('compression')}")
                    print()
            except Exception as e:
                print(f"Не удалось прочитать manifest: {e}")
                print()

        for member in members:
            if member.isdir() or member.name == "codex_history_manifest.json":
                continue

            if member.name.startswith(".codex/sessions/"):
                relative_to_codex_home = member.name.replace(".codex/", "", 1)
            else:
                relative_to_codex_home = member.name

            target = codex_home / relative_to_codex_home

            if not str(target.resolve()).startswith(str(codex_home.resolve())):
                print("Ошибка: попытка распаковать файл вне CODEX_HOME:")
                print(f"  {target}")
                return 1

            src = tar.extractfile(member)
            if src is None:
                continue

            raw_bytes = src.read()

            try:
                text = raw_bytes.decode("utf-8")
                text, replacements = replace_project_paths(
                    text=text,
                    old_project_path=old_project_path,
                    current_project_dir=current_project_dir
                )
                data_to_write = text.encode("utf-8")
                path_replacements_total += replacements
            except UnicodeDecodeError:
                data_to_write = raw_bytes
                replacements = 0

            target.parent.mkdir(parents=True, exist_ok=True)

            if target.exists():
                backup = target.with_suffix(target.suffix + ".bak")
                shutil.copy2(target, backup)
                overwritten.append(target)
            else:
                imported.append(target)

            with target.open("wb") as out:
                out.write(data_to_write)

            if replacements:
                print(f"Обновлен путь проекта в {target.name}: замен {replacements}")

    print()
    print("Импорт завершен.")
    print()

    if imported:
        print("Импортированы файлы:")
        for file in imported:
            print(f"  {file}")

    if overwritten:
        print()
        print("Перезаписаны существующие файлы, backup создан рядом:")
        for file in overwritten:
            print(f"  {file}")
            print(f"  backup: {file}.bak")

    print()
    print(f"Всего замен путей проекта: {path_replacements_total}")

    session_ids = []

    for file in imported + overwritten:
        sid = extract_session_id(file.name)
        if sid:
            session_ids.append(sid)

    if session_ids:
        print()
        print("Теперь попробуй открыть историю:")
        print("  codex resume --all")
        print()
        print("Или напрямую:")
        for sid in sorted(set(session_ids)):
            print(f"  codex resume {sid}")

    print()
    print("После этого полностью перезапусти приложение Codex.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())