# Nornickel AI Science API

Spring Boot API for the "Научный клубок" MVP.

## Stack

- Spring Boot
- Spring MVC controllers
- Spring Data JPA
- PostgreSQL + Flyway
- Kafka
- MinIO
- Spring AI + Yandex AI Studio
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
- `GET /api/documents/{documentId}/visuals/{visualId}` - extracted source image
- `POST /api/documents/{documentId}/publish` - publish reviewed extraction
- `GET /api/data-issues` - data quality issues
- `GET /api/jobs/{jobId}` - ingestion job status

## GraphRAG Integration

Spring API calls the internal Python service:

- `POST /internal/graphrag/retrieve`
- `POST /internal/graphrag/extract`
- `POST /internal/graphrag/publish`

The Python service uses the official `neo4j-graphrag` KG Builder pipeline:

- source-aware loading and chunking from MinIO for PDF, DOCX, PPTX, XLSX and CSV;
- block-aware DOCX parsing with rendered pages, sections, tables, formulas,
  captions and numbered bibliography entries;
- structured extraction of tables into Markdown with rows, headers and units;
- multimodal analysis of PDF graphics and embedded document images;
- PPTX slide parsing with tables, images, chart series and diagram elements;
- visual provenance (`visualId`, page/slide and type) shown in extraction
  review and chat citations;
- Yandex AI Studio extraction into the fixed ontology with dynamic entity attributes;
- a review draft before anything is published to Neo4j;
- fuzzy and exact entity resolution;
- document-level type normalization, bilingual aliases and duplicate merging;
- a lexical graph (`Document` → `Chunk`) with source pages and vector embeddings;
- hybrid vector/full-text retrieval enriched with graph paths;
- `@` mentions and IDs as explicit graph anchors;
- dynamic graph depth from one hop for exact questions to four hops for research;
- strict filters by entity type, geography, year and normalized numeric facts;
- source-aware inline citations, recommendations and human-readable graph paths;
- exact entity provenance with page, section, chunk and supporting quote;
- extended ontology for processes, publications, experts, facilities, technologies,
  geography and economic indicators;
- expert corrections, duplicate merging and revision history.

## Chat search modes

В поле ввода чата можно явно включить поиск в открытых источниках:

- `knowledge_base` — основной режим GraphRAG. Если пользователь прямо просит
  поискать сведения в интернете или присылает внешний URL, маршрутизатор может
  автоматически вызвать инструмент открытых источников;
- `open_sources` — принудительный поиск только в интернете через Yandex Search API.

В режиме открытых источников API получает до пяти результатов, читает доступные
HTML-страницы и передаёт релевантные фрагменты финальной LLM. URL, название,
дата и использованная цитата сохраняются вместе с сообщением в PostgreSQL и
остаются доступны после перезагрузки страницы. Внешние страницы не создают
сущности или связи и никогда не публикуются в Neo4j.

Если в сообщении есть URL, система читает именно указанную страницу, не
подменяя её похожими результатами поисковой выдачи. Для неоднозначных запросов
решение о вызове инструмента принимает отдельная небольшая LLM-модель, а явные
команды и URL обрабатываются без дополнительного модельного вызова.

Режим настраивается переменными:

```env
WEB_SEARCH_ENABLED=true
WEB_SEARCH_RESULT_LIMIT=5
YANDEX_SEARCH_BASE_URL=https://searchapi.api.cloud.yandex.net/v2/web/search
```

По умолчанию Search API использует `YANDEX_API_KEY` и `YANDEX_FOLDER_ID`.
Для ключа должен быть разрешён доступ к Yandex Search API в выбранном каталоге.
Если Search API отключён или недоступен, ошибка относится только к режиму
открытых источников; поиск по внутренней базе продолжает работать.

KG Builder is currently marked experimental by Neo4j. Its API is intentionally used for this hackathon build, but the optional `experimental` dependency bundle is not installed because it would also pull unrelated LlamaIndex, PyArrow and visualization packages. The generation and embedding models are provided by Yandex AI Studio. Model selection, chunking and retrieval limits are configured through the `YANDEX_*` and `GRAPHRAG_*` environment variables in `docker-compose.yml`.

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
- `11–18%` — извлечение и анализ таблиц, графиков, схем и изображений;
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

## Yandex AI Studio

Финальный ответ и преобразование поисковых запросов выполняет Spring AI через
OpenAI-совместимый Chat Completions API Yandex AI Studio. Python GraphRAG
использует тот же API для извлечения сущностей и нативный Yandex Embeddings API
для векторного поиска.

Создайте `.env` рядом с `docker-compose.yml` на основе `.env.example`:

```env
YANDEX_API_KEY=<новый API-ключ>
YANDEX_FOLDER_ID=<идентификатор каталога>
YANDEX_CHAT_MODEL_NAME=yandexgpt-5.1
YANDEX_QUERY_MODEL_NAME=yandexgpt-5-lite
YANDEX_EXTRACTION_MODEL_NAME=yandexgpt-5.1
YANDEX_VISION_MODEL_NAME=yandexgpt-5.1
```

API-ключ обязателен и не должен попадать в Git, Docker image или логи.
`docker-compose.yml` собирает полные URI моделей из `YANDEX_FOLDER_ID` и имён:

- чат: `gpt://<folder-id>/yandexgpt-5.1`;
- преобразование запроса: `gpt://<folder-id>/yandexgpt-5-lite`;
- извлечение графа: `gpt://<folder-id>/yandexgpt-5.1`;
- анализ изображений: `gpt://<folder-id>/yandexgpt-5.1`;
- индексация документов: `emb://<folder-id>/text-embeddings-v2-doc`;
- векторизация запросов: `emb://<folder-id>/text-embeddings-v2-query`.

Пара `text-embeddings-v2-doc` / `text-embeddings-v2-query` намеренно разделена:
первая строит векторы фрагментов документов, вторая — совместимые с ними векторы
поисковых запросов.

После перехода с другой embedding-модели все ранее опубликованные документы
нужно повторно обработать и опубликовать. При первой новой публикации GraphRAG
пересоздаст векторный индекс Neo4j с актуальной размерностью, но старые векторы
автоматически не преобразуются.

Если модель преобразования недоступна или преобразование потеряло ID/числа, чат
автоматически использует исходный запрос и сохраняет причину в истории обработки
ответа.

Для широких выборок со строгими условиями используется отдельный лимит:

```env
GRAPHRAG_FILTERED_RETRIEVAL_TOP_K=30
```

`GRAPHRAG_RETRIEVAL_TOP_K` остаётся компактным лимитом обычного семантического
поиска, а новый параметр позволяет не обрезать запросы вида «покажи все
материалы, где содержание никеля выше 50%».

Короткие вопросы вида «кто/когда/где» используют отдельный фактологический
профиль: общие слова не становятся графовыми якорями, текстовые и визуальные
фрагменты одной страницы объединяются, рекомендации отключаются, а prompt
получает только наиболее релевантные фрагменты:

```env
GRAPHRAG_FACT_RETRIEVAL_TOP_K=3
GRAPHRAG_FACT_ENTITY_LIMIT=8
GRAPHRAG_FACT_PATH_LIMIT=6
GRAPHRAG_FACT_CONTEXT_CHARACTERS=1600
```

Количество визуальных фрагментов и максимальный размер изображения управляются
переменными:

```env
GRAPHRAG_MAX_VISUAL_FRAGMENTS=20
GRAPHRAG_MAX_VISUAL_IMAGE_SIZE=1600
```

Точные значения из таблиц сохраняются как структурированные данные. Значения,
которые vision-модель оценила по положению точки или линии на графике,
помечаются как приблизительные и не должны использоваться как точные измерения.
Ошибка vision-модели не прерывает обработку текстовой части документа.

После изменения моделей пересоздайте API и GraphRAG service:

```bash
docker compose up -d --build --force-recreate api graphrag-service
```

Документация Yandex AI Studio:

- [модели генерации](https://aistudio.yandex.ru/docs/ru/ai-studio/concepts/generation/models);
- [эмбеддинги](https://aistudio.yandex.ru/docs/ru/ai-studio/concepts/embeddings);
- [отключение логирования запросов](https://aistudio.yandex.ru/docs/ru/ai-studio/operations/disable-logging).
