from neo4j import GraphDatabase
from neo4j_graphrag.embeddings import OpenAIEmbeddings
from neo4j_graphrag.llm import OpenAILLM

from .config import settings


driver = GraphDatabase.driver(
    settings.neo4j_uri,
    auth=(settings.neo4j_username, settings.neo4j_password),
)

if not settings.yandex_api_key or not settings.yandex_folder_id:
    raise RuntimeError(
        "YANDEX_API_KEY and YANDEX_FOLDER_ID are required"
    )

openai_client_options = {
    "api_key": settings.yandex_api_key,
    "project": settings.yandex_folder_id,
    "base_url": settings.yandex_base_url,
}

document_embedder = OpenAIEmbeddings(
    model=settings.document_embedding_model,
    **openai_client_options,
)

query_embedder = OpenAIEmbeddings(
    model=settings.query_embedding_model,
    **openai_client_options,
)

extraction_llm = OpenAILLM(
    model_name=settings.extraction_model,
    model_params={"temperature": 0},
    **openai_client_options,
)
