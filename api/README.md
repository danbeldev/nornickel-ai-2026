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

The included `graphrag-service` is an MVP implementation. It reads uploaded files from MinIO, extracts basic entities and relations, publishes them to Neo4j, and retrieves graph context for chat answers.

## Runtime Modes

`APP_INGESTION_PROCESS_IMMEDIATELY=false` is the default Docker mode. Upload/publish endpoints use Kafka as the async processing boundary.

Set `APP_INGESTION_PROCESS_IMMEDIATELY=true` for synchronous demo mode:

- `document.processing.requested`
- `document.publish.requested`

Failures are retried and then sent to:

- `document.processing.requested.dlq`
- `document.publish.requested.dlq`
