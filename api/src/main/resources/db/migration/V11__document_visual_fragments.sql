alter table extraction_drafts
    add column if not exists visual_fragments_json jsonb not null default '[]'::jsonb;
