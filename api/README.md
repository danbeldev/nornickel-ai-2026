# Nornickel AI Science API

Spring Boot API for the "Научный клубок" MVP.

## Stack

- Spring Boot
- Spring MVC controllers
- Spring Data JPA
- PostgreSQL + Flyway
- Kafka
- MinIO
- Spring AI + Ollama
- OpenFeign client for Python GraphRAG
- Swagger UI
- Lombok

## Main Endpoints

- `GET /api/home` - overview stats and example queries
- `GET /api/search?query=...` - lightweight knowledge search
- `GET /api/entities/search?query=...` - entities for `@` mentions
- `GET /api/chats` - chat list
- `POST /api/chats` - create chat and ask first question
- `GET /api/chats/{chatId}` - chat with messages
- `POST /api/chats/{chatId}/messages` - ask assistant
- `POST /api/chats/{chatId}/messages/stream` - SSE answer stream
- `GET /api/knowledge-graph` - full graph snapshot
- `GET /api/knowledge-graph/preview` - graph preview for overview
- `GET /api/knowledge-graph/entities/{id}/facts` - normalized facts with provenance
- `GET /api/knowledge-graph/entities/{id}/versions` - entity revision history
- `PUT /api/knowledge-graph/entities/{id}` - expert correction
- `POST /api/knowledge-graph/entities/{id}/merge` - merge a duplicate
- `POST|PUT|DELETE /api/knowledge-graph/connections...` - manual relation editing
- `GET /api/experiments` - experimental records
- `GET /api/materials` - materials
- `GET /api/documents` - documents
- `POST /api/documents` - upload document as multipart `file`
- `POST /api/documents/enqueue` - upload document and process through Kafka
- `GET /api/documents/{documentId}/extraction` - extraction draft
- `POST /api/documents/{documentId}/publish` - publish reviewed extraction
- `GET /api/data-issues` - data quality issues
- `GET /api/jobs/{jobId}` - ingestion job status

## GraphRAG Integration

Spring API calls the internal Python service:

- `POST /internal/graphrag/retrieve`
- `POST /internal/graphrag/extract`
- `POST /internal/graphrag/publish`

The Python service uses the official `neo4j-graphrag` KG Builder pipeline:

- source-aware loading and chunking from MinIO, preserving PDF pages and XLSX sheets;
- Ollama extraction into the fixed ontology with dynamic entity attributes;
- a review draft before anything is published to Neo4j;
- fuzzy and exact entity resolution;
- a lexical graph (`Document` → `Chunk`) with source pages and vector embeddings;
- hybrid vector/full-text retrieval enriched with graph paths;
- `@` mentions and IDs as explicit graph anchors;
- dynamic graph depth from one hop for exact questions to four hops for research;
- strict filters by entity type, geography, year and normalized numeric facts;
- source-aware inline citations, recommendations and human-readable graph paths;
- extended ontology for processes, publications, experts, facilities, technologies,
  geography and economic indicators;
- expert corrections, duplicate merging and revision history.

KG Builder is currently marked experimental by Neo4j. Its API is intentionally used for this hackathon build, but the optional `experimental` dependency bundle is not installed because it would also pull unrelated LlamaIndex, PyArrow and visualization packages. The extraction and embedding models, chunking and retrieval limits are configured through the `OLLAMA_*` and `GRAPHRAG_*` environment variables in `docker-compose.yml`.

## Runtime Modes

`APP_INGESTION_PROCESS_IMMEDIATELY=false` is the default Docker mode. Upload/publish endpoints use Kafka as the async processing boundary.

Веб-интерфейс загружает документ через `POST /api/documents/enqueue`. API сохраняет файл и сразу возвращает `202 Accepted` вместе с `jobId`. После этого интерфейс опрашивает `GET /api/jobs/{jobId}`:

- `queued` — задача ожидает обработки;
- `running` — GraphRAG извлекает данные;
- `ready_for_review` — черновик готов для ручной проверки;
- `published` — подтверждённые данные опубликованы;
- `failed` — обработка завершилась ошибкой.

Долгий вызов LLM выполняется Kafka consumer и не удерживает исходный HTTP-запрос.

Прогресс сохраняется в PostgreSQL и доступен после перезагрузки страницы. Для извлечения используются следующие контрольные точки:

- `5%` — Kafka consumer принял документ;
- `10%` — загрузка и чтение файла;
- `20%` — документ разделён на фрагменты;
- `30%` — построены embeddings;
- `35–85%` — LLM последовательно обрабатывает фрагменты;
- `90–95%` — объединение сущностей и сохранение черновика;
- `100%` — черновик готов к проверке.

Во время LLM-этапа Python service отправляет heartbeat каждые 15 секунд. В интерфейсе отображаются число обработанных фрагментов, примерное прошедшее время и момент последнего обновления.

Обработку можно отменить через `POST /api/jobs/{jobId}/cancel`. Job и документ получают статус `canceled`, результат не сохраняется, а Python service отменяет активную asyncio-задачу извлечения. Если задача ещё находилась в Kafka-очереди, consumer пропустит её после получения.

Set `APP_INGESTION_PROCESS_IMMEDIATELY=true` for synchronous demo mode:

- `document.processing.requested`
- `document.publish.requested`

Failures are retried and then sent to:

- `document.processing.requested.dlq`
- `document.publish.requested.dlq`

## Настройка потребления памяти Ollama

### Переключение между Ollama на Mac и в Docker

По умолчанию API и GraphRAG service обращаются к Ollama, установленной непосредственно на macOS:

```env
OLLAMA_BASE_URL=http://host.docker.internal:11434
```

Такой режим позволяет Ollama использовать Apple Metal. Контейнер `ollama` при обычном `docker compose up` не запускается, поскольку вынесен в профиль `docker-ollama`.

На Linux-сервере Ollama можно запустить вместе с остальными контейнерами. Для этого в `.env` необходимо указать:

```env
OLLAMA_BASE_URL=http://ollama:11434
```

После этого Compose запускается с профилем:

```bash
docker compose --profile docker-ollama up -d
```

Образ Ollama и volume с моделями остаются описаны в `docker-compose.yml`, поэтому переключение не требует изменения исходного файла.

В `docker-compose.yml` по умолчанию включен экономный режим:

```yaml
OLLAMA_MAX_LOADED_MODELS: 1
OLLAMA_NUM_PARALLEL: 1
```

- `OLLAMA_MAX_LOADED_MODELS` определяет, сколько моделей Ollama может одновременно держать в памяти. В проекте используются чат-модель и отдельная embedding-модель. Значение `1` экономит память, но при переключении между поиском и генерацией Ollama может заново загружать нужную модель. Значение `2` ускоряет работу, если памяти достаточно для обеих моделей.
- `OLLAMA_NUM_PARALLEL` определяет, сколько запросов одна загруженная модель может обрабатывать одновременно. Значение `1` требует меньше памяти. Значения `2` и выше повышают пропускную способность, но заметно увеличивают расход RAM.

Для компьютера или Docker VM с 8 ГБ памяти рекомендуется оставить:

```env
OLLAMA_MAX_LOADED_MODELS=1
OLLAMA_NUM_PARALLEL=1
```

Если доступно больше памяти, например 16 ГБ и более, можно попробовать:

```env
OLLAMA_MAX_LOADED_MODELS=2
OLLAMA_NUM_PARALLEL=2
```

Значения можно сохранить в файле `.env` рядом с `docker-compose.yml` либо передать при запуске:

```bash
OLLAMA_MAX_LOADED_MODELS=2 OLLAMA_NUM_PARALLEL=2 docker compose up -d
```

### Модель преобразования поисковых запросов

Для сжатия follow-up и переформулирования длинных запросов используется отдельно
настраиваемая модель. По умолчанию это `ornith:9b`; её можно заменить через:

```bash
OLLAMA_QUERY_MODEL=ornith:9b
```

Перед запуском с Ollama на хост-машине модель нужно загрузить:

```bash
ollama pull ornith:9b
```

При запуске Ollama из Docker:

```bash
docker compose --profile docker-ollama exec ollama ollama pull ornith:9b
```

Если модель недоступна или преобразование потеряло ID/числа, чат автоматически
использует исходный запрос и сохраняет причину в истории обработки ответа.

Для широких выборок со строгими условиями используется отдельный лимит:

```env
GRAPHRAG_FILTERED_RETRIEVAL_TOP_K=30
```

`GRAPHRAG_RETRIEVAL_TOP_K` остаётся компактным лимитом обычного семантического
поиска, а новый параметр позволяет не обрезать запросы вида «покажи все
материалы, где содержание никеля выше 50%».

После изменения этих параметров контейнер `ollama` необходимо пересоздать:

```bash
docker compose up -d --force-recreate ollama
```
