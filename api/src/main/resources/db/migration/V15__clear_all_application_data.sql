TRUNCATE TABLE
    knowledge_connection_versions,
    knowledge_entity_versions,
    knowledge_facts,
    knowledge_synonyms,
    extraction_drafts,
    ingestion_jobs,
    spring_ai_chat_memory,
    chat_messages,
    chats,
    experiments,
    materials,
    data_issues,
    knowledge_connections,
    knowledge_entities,
    documents
RESTART IDENTITY CASCADE;
