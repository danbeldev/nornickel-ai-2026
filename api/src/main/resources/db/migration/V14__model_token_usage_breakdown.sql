alter table documents
    add column processing_token_usage_json jsonb not null default '[]'::jsonb;

alter table chat_messages
    add column token_usage_json jsonb not null default '[]'::jsonb;
