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

    allowed = (
        name == "codex_history_manifest.json"
        or name.startswith("sessions/")
        or name.startswith(".codex/sessions/")
    )

    return allowed


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


def main() -> int:
    script_dir = Path(__file__).resolve().parent
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

    print("Найден архив для импорта:")
    print(f"  {archive_path}")
    print()
    print("Импорт будет выполнен в Codex home:")
    print(f"  {codex_home}")
    print()

    codex_home.mkdir(parents=True, exist_ok=True)

    imported = []
    skipped = []

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
                    print("Информация об архиве:")
                    print(f"  Проект: {manifest.get('project_name')}")
                    print(f"  Сессий: {manifest.get('sessions_count')}")
                    print(f"  Экспортировано: {manifest.get('exported_at')}")
                    print(f"  Сжатие: {manifest.get('compression')}")
                    print()
            except Exception:
                pass

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

            if target.exists():
                skipped.append(target)
                continue

            target.parent.mkdir(parents=True, exist_ok=True)

            src = tar.extractfile(member)
            if src is None:
                continue

            with target.open("wb") as out:
                shutil.copyfileobj(src, out)

            imported.append(target)

    print("Импорт завершен.")
    print()

    if imported:
        print("Импортированы файлы:")
        for file in imported:
            print(f"  {file}")
    else:
        print("Новых файлов не импортировано.")

    if skipped:
        print()
        print("Пропущены, потому что уже существуют:")
        for file in skipped:
            print(f"  {file}")

    session_ids = []

    for file in imported + skipped:
        sid = extract_session_id(file.name)
        if sid:
            session_ids.append(sid)

    if session_ids:
        print()
        print("Теперь можно попробовать открыть историю:")
        print("  codex resume")
        print()
        print("Или напрямую:")
        for sid in sorted(set(session_ids)):
            print(f"  codex resume {sid}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
