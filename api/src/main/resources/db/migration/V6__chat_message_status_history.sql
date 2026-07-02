ALTER TABLE chat_messages
    ADD COLUMN status_history_json JSONB NOT NULL DEFAULT '[]'::jsonb;
