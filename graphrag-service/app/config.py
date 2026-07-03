import os


class Settings:
    neo4j_uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    neo4j_username = os.getenv("NEO4J_USERNAME", "neo4j")
    neo4j_password = os.getenv("NEO4J_PASSWORD", "nornickel-password")
    neo4j_database = os.getenv("NEO4J_DATABASE", "neo4j")

    minio_endpoint = os.getenv("MINIO_ENDPOINT", "localhost:9000")
    minio_access_key = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
    minio_secret_key = os.getenv("MINIO_SECRET_KEY", "minioadmin")
    minio_bucket = os.getenv("MINIO_BUCKET", "documents")

    yandex_api_key = os.getenv("YANDEX_API_KEY", "")
    yandex_folder_id = os.getenv("YANDEX_FOLDER_ID", "")
    yandex_base_url = os.getenv(
        "YANDEX_OPENAI_BASE_URL",
        "https://ai.api.cloud.yandex.net/v1",
    ).rstrip("/")
    spring_api_base_url = os.getenv("SPRING_API_BASE_URL", "http://localhost:8080")
    extraction_model = os.getenv(
        "YANDEX_EXTRACTION_MODEL",
        f"gpt://{yandex_folder_id}/yandexgpt-5.1",
    )
    document_embedding_model = os.getenv(
        "YANDEX_DOCUMENT_EMBEDDING_MODEL",
        f"emb://{yandex_folder_id}/text-embeddings-v2-doc/",
    )
    query_embedding_model = os.getenv(
        "YANDEX_QUERY_EMBEDDING_MODEL",
        f"emb://{yandex_folder_id}/text-embeddings-v2-query/",
    )

    chunk_size = int(os.getenv("GRAPHRAG_CHUNK_SIZE", "1400"))
    chunk_overlap = int(os.getenv("GRAPHRAG_CHUNK_OVERLAP", "180"))
    retrieval_top_k = int(os.getenv("GRAPHRAG_RETRIEVAL_TOP_K", "8"))
    filtered_retrieval_top_k = int(
        os.getenv("GRAPHRAG_FILTERED_RETRIEVAL_TOP_K", "30")
    )
    entity_resolution_threshold = float(
        os.getenv("GRAPHRAG_ENTITY_RESOLUTION_THRESHOLD", "0.92")
    )


settings = Settings()
