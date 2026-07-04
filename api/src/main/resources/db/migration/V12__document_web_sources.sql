alter table documents
    add column if not exists source_url varchar(2048),
    add column if not exists published_at timestamptz;
