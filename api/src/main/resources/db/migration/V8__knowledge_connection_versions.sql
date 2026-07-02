CREATE TABLE knowledge_connection_versions (
    id VARCHAR(160) PRIMARY KEY,
    connection_id VARCHAR(128) NOT NULL,
    source_id VARCHAR(128) NOT NULL,
    target_id VARCHAR(128) NOT NULL,
    relation_type VARCHAR(128) NOT NULL,
    change_type VARCHAR(32) NOT NULL,
    change_message TEXT,
    changed_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_connection_versions_connection
    ON knowledge_connection_versions(connection_id, changed_at DESC);
