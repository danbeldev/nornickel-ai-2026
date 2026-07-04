#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LAST_TAG_FILE="${ROOT_DIR}/.deploy-tag"
TAG="${1:-${DEPLOY_TAG:-}}"
if [[ -z "$TAG" && -f "$LAST_TAG_FILE" ]]; then
  TAG="$(<"$LAST_TAG_FILE")"
fi
TAG="${TAG:-local}"
export DEPLOY_TAG="$TAG"

cd "$ROOT_DIR"

for image in \
  "nornickel-ai-2026-web:${TAG}" \
  "nornickel-ai-2026-api:${TAG}" \
  "nornickel-ai-2026-graphrag-service:${TAG}"
do
  if ! docker image inspect "$image" >/dev/null 2>&1; then
    echo "Не найден готовый образ: ${image}" >&2
    exit 1
  fi
done

docker compose \
  -f docker-compose.yml \
  -f docker-compose.deploy.yml \
  up -d --no-build --remove-orphans

printf '%s\n' "$TAG" > "$LAST_TAG_FILE"

for repository in \
  nornickel-ai-2026-web \
  nornickel-ai-2026-api \
  nornickel-ai-2026-graphrag-service
do
  mapfile -t old_images < <(
    docker image ls "$repository" \
      --format '{{.Repository}}:{{.Tag}}' \
      | awk '!seen[$0]++' \
      | tail -n +3
  )
  if ((${#old_images[@]} > 0)); then
    docker image rm "${old_images[@]}" >/dev/null 2>&1 || true
  fi
done

docker compose \
  -f docker-compose.yml \
  -f docker-compose.deploy.yml \
  ps
