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

    ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    extraction_model = os.getenv(
        "OLLAMA_EXTRACTION_MODEL",
        os.getenv("OLLAMA_CHAT_MODEL", "ornith:9b"),
    )
    embedding_model = os.getenv("OLLAMA_EMBEDDING_MODEL", "bge-m3")

    chunk_size = int(os.getenv("GRAPHRAG_CHUNK_SIZE", "1400"))
    chunk_overlap = int(os.getenv("GRAPHRAG_CHUNK_OVERLAP", "180"))
    retrieval_top_k = int(os.getenv("GRAPHRAG_RETRIEVAL_TOP_K", "8"))
    entity_resolution_threshold = float(
        os.getenv("GRAPHRAG_ENTITY_RESOLUTION_THRESHOLD", "0.92")
    )


settings = Settings()
