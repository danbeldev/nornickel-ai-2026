import os


class Settings:
    demo_mode = os.getenv("DEMO_MODE", "false").lower() in {
        "1", "true", "yes", "on"
    }
    demo_document_step_delay_ms = int(
        os.getenv("DEMO_DOCUMENT_STEP_DELAY_MS", "650")
    )
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
    yandex_embedding_base_url = os.getenv(
        "YANDEX_EMBEDDING_BASE_URL",
        "https://llm.api.cloud.yandex.net/foundationModels/v1/textEmbedding",
    ).rstrip("/")
    spring_api_base_url = os.getenv("SPRING_API_BASE_URL", "http://localhost:8080")
    extraction_model = os.getenv(
        "YANDEX_EXTRACTION_MODEL",
        f"gpt://{yandex_folder_id}/yandexgpt-5.1",
    )
    vision_model = os.getenv(
        "YANDEX_VISION_MODEL",
        extraction_model,
    )
    document_embedding_model = os.getenv(
        "YANDEX_DOCUMENT_EMBEDDING_MODEL",
        f"emb://{yandex_folder_id}/text-embeddings-v2-doc",
    )
    query_embedding_model = os.getenv(
        "YANDEX_QUERY_EMBEDDING_MODEL",
        f"emb://{yandex_folder_id}/text-embeddings-v2-query",
    )

    chunk_size = int(os.getenv("GRAPHRAG_CHUNK_SIZE", "1400"))
    chunk_overlap = int(os.getenv("GRAPHRAG_CHUNK_OVERLAP", "180"))
    max_visual_fragments = int(
        os.getenv("GRAPHRAG_MAX_VISUAL_FRAGMENTS", "20")
    )
    max_visual_image_size = int(
        os.getenv("GRAPHRAG_MAX_VISUAL_IMAGE_SIZE", "1600")
    )
    retrieval_top_k = int(os.getenv("GRAPHRAG_RETRIEVAL_TOP_K", "8"))
    fact_retrieval_top_k = int(
        os.getenv("GRAPHRAG_FACT_RETRIEVAL_TOP_K", "3")
    )
    fact_entity_limit = int(
        os.getenv("GRAPHRAG_FACT_ENTITY_LIMIT", "8")
    )
    fact_path_limit = int(
        os.getenv("GRAPHRAG_FACT_PATH_LIMIT", "6")
    )
    fact_context_characters = int(
        os.getenv("GRAPHRAG_FACT_CONTEXT_CHARACTERS", "1600")
    )
    filtered_retrieval_top_k = int(
        os.getenv("GRAPHRAG_FILTERED_RETRIEVAL_TOP_K", "30")
    )
    entity_resolution_threshold = float(
        os.getenv("GRAPHRAG_ENTITY_RESOLUTION_THRESHOLD", "0.92")
    )


settings = Settings()
