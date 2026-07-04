# Быстрый деплой без сборки на сервере

Сервер `45.128.205.5` имеет 2 CPU и около 4 ГБ RAM. Параллельная сборка
React, Gradle и Python-образа на нём приводит к активному использованию swap
и может вызвать OOM-killer. Поэтому приложение собирается локально, а сервер
только загружает готовые Docker-образы и перезапускает контейнеры.

## Обычный деплой

На локальном компьютере должен быть запущен Docker Desktop.

```bash
./scripts/deploy-local.sh
```

Скрипт:

1. собирает `web`, `api` и `graphrag-service` для `linux/amd64`;
2. проверяет архитектуру образов;
3. передаёт образы на сервер по SSH в сжатом виде;
4. запускает `docker compose up -d --no-build`.

Адрес и каталог можно переопределить:

```bash
DEPLOY_SERVER=root@45.128.205.5 \
DEPLOY_REMOTE_DIR=/opt/nornickel-ai-2026 \
./scripts/deploy-local.sh
```

## Повторный запуск уже загруженной версии

На сервере:

```bash
cd /opt/nornickel-ai-2026
./scripts/server-start.sh
```

Скрипт принципиально использует `--no-build`: запуск не создаёт Gradle,
npm или pip-процессы и не нагружает сервер компиляцией.

Для отката можно явно передать тег предыдущего образа:

```bash
./scripts/server-start.sh <тег-версии>
```

## Диагностика

```bash
free -h
docker stats --no-stream
docker system df
journalctl -k --since "1 hour ago" | grep -Ei "oom|killed process"
```

Очистку общего Docker build cache нельзя выполнять автоматически: на сервере
работают и другие проекты. Перед `docker builder prune` необходимо убедиться,
что их кеш сборки больше не нужен.
