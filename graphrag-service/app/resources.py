from neo4j import GraphDatabase
from neo4j_graphrag.embeddings import OllamaEmbeddings
from neo4j_graphrag.llm import OllamaLLM

from .config import settings


driver = GraphDatabase.driver(
    settings.neo4j_uri,
    auth=(settings.neo4j_username, settings.neo4j_password),
)

embedder = OllamaEmbeddings(
    model=settings.embedding_model,
    host=settings.ollama_base_url,
)

extraction_llm = OllamaLLM(
    model_name=settings.extraction_model,
    host=settings.ollama_base_url,
    model_params={
        "options": {"temperature": 0},
        "format": "json",
    },
)
