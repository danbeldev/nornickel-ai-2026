ALTER TABLE knowledge_entities
    ADD COLUMN confidence DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    ADD COLUMN verification_status VARCHAR(32) NOT NULL DEFAULT 'EXTRACTED',
    ADD COLUMN geography VARCHAR(256),
    ADD COLUMN publication_year INTEGER,
    ADD COLUMN language VARCHAR(32),
    ADD COLUMN version INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE knowledge_facts (
    id VARCHAR(160) PRIMARY KEY,
    entity_id VARCHAR(128) NOT NULL REFERENCES knowledge_entities(id) ON DELETE CASCADE,
    name VARCHAR(256) NOT NULL,
    operator VARCHAR(16),
    numeric_value DOUBLE PRECISION,
    min_value DOUBLE PRECISION,
    max_value DOUBLE PRECISION,
    unit VARCHAR(64),
    normalized_unit VARCHAR(64),
    text_value TEXT,
    source_document_id VARCHAR(128),
    source_page INTEGER,
    confidence DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_knowledge_facts_entity_id ON knowledge_facts(entity_id);
CREATE INDEX idx_knowledge_facts_name_numeric ON knowledge_facts(name, numeric_value);
CREATE INDEX idx_knowledge_facts_range ON knowledge_facts(name, min_value, max_value);

CREATE TABLE knowledge_entity_versions (
    id VARCHAR(160) PRIMARY KEY,
    entity_id VARCHAR(128) NOT NULL REFERENCES knowledge_entities(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    change_type VARCHAR(32) NOT NULL,
    change_message TEXT,
    snapshot_json JSONB NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL,
    UNIQUE(entity_id, version)
);

CREATE INDEX idx_knowledge_versions_entity ON knowledge_entity_versions(entity_id, version DESC);

CREATE TABLE knowledge_synonyms (
    id VARCHAR(160) PRIMARY KEY,
    entity_type VARCHAR(32),
    canonical_term VARCHAR(512) NOT NULL,
    alias VARCHAR(512) NOT NULL,
    language VARCHAR(16),
    confirmed BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE(entity_type, alias)
);

INSERT INTO knowledge_synonyms (id, entity_type, canonical_term, alias, language) VALUES
    ('syn-electrowinning-en', 'PROCESS', 'электроэкстракция', 'electrowinning', 'en'),
    ('syn-electrowinning-ru', 'PROCESS', 'электроэкстракция', 'электроэкстракция', 'ru'),
    ('syn-flash-furnace-ru', 'EQUIPMENT', 'печь взвешенной плавки', 'ПВП', 'ru'),
    ('syn-flash-furnace-en', 'EQUIPMENT', 'печь взвешенной плавки', 'flash smelting furnace', 'en')
ON CONFLICT DO NOTHING;
