#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER="${DEPLOY_SERVER:-root@45.128.205.5}"
REMOTE_DIR="${DEPLOY_REMOTE_DIR:-/opt/nornickel-ai-2026}"
PLATFORM="${DEPLOY_PLATFORM:-linux/amd64}"
SKIP_BUILD="${DEPLOY_SKIP_BUILD:-false}"

if [[ "${1:-}" == "--skip-build" ]]; then
  SKIP_BUILD=true
  shift
fi

TAG="${1:-${DEPLOY_TAG:-$(date -u +%Y%m%d-%H%M%S)}}"

cd "$ROOT_DIR"

if ! docker info >/dev/null 2>&1; then
  echo "Docker недоступен. Запустите Docker Desktop и повторите команду." >&2
  exit 1
fi

if [[ -z "${DEMO_MODE+x}" && -f .env ]]; then
  DEMO_MODE="$(
    sed -n 's/^DEMO_MODE=//p' .env \
      | tail -n 1 \
      | tr -d '\r' \
      | tr -d '"'
  )"
fi

WEB_IMAGE="nornickel-ai-2026-web:${TAG}"
API_IMAGE="nornickel-ai-2026-api:${TAG}"
GRAPHRAG_IMAGE="nornickel-ai-2026-graphrag-service:${TAG}"

if [[ "$SKIP_BUILD" == "true" ]]; then
  echo "Сборка пропущена. Используются готовые образы с тегом ${TAG}."
else
  echo "Сборка web для ${PLATFORM}..."
  docker buildx build \
    --platform "$PLATFORM" \
    --load \
    --tag "$WEB_IMAGE" \
    --build-arg REACT_APP_API_BASE_URL=/api \
    --build-arg "REACT_APP_DEMO_MODE=${DEMO_MODE:-false}" \
    web

  echo "Сборка API для ${PLATFORM}..."
  docker buildx build \
    --platform "$PLATFORM" \
    --load \
    --tag "$API_IMAGE" \
    api

  echo "Сборка GraphRAG service для ${PLATFORM}..."
  docker buildx build \
    --platform "$PLATFORM" \
    --load \
    --tag "$GRAPHRAG_IMAGE" \
    graphrag-service
fi

for image in "$WEB_IMAGE" "$API_IMAGE" "$GRAPHRAG_IMAGE"; do
  architecture="$(docker image inspect --format '{{.Os}}/{{.Architecture}}' "$image")"
  if [[ "$architecture" != "$PLATFORM" ]]; then
    echo "Образ ${image} имеет архитектуру ${architecture}, ожидалась ${PLATFORM}." >&2
    exit 1
  fi
done

echo "Передача compose-файлов..."
ssh "$SERVER" "mkdir -p '$REMOTE_DIR/scripts'"
scp \
  docker-compose.yml \
  docker-compose.deploy.yml \
  scripts/server-start.sh \
  "$SERVER:$REMOTE_DIR/"
ssh "$SERVER" \
  "mv '$REMOTE_DIR/server-start.sh' '$REMOTE_DIR/scripts/server-start.sh' \
  && chmod +x '$REMOTE_DIR/scripts/server-start.sh'"

echo "Передача готовых Docker-образов..."
docker save "$WEB_IMAGE" "$API_IMAGE" "$GRAPHRAG_IMAGE" \
  | gzip -1 \
  | ssh "$SERVER" "gzip -d | docker load"

echo "Запуск на сервере без сборки..."
ssh "$SERVER" \
  "cd '$REMOTE_DIR' && DEPLOY_TAG='$TAG' ./scripts/server-start.sh '$TAG'"

echo "Готово. Развёрнута версия ${TAG}."
