create table chats (
    id varchar(128) primary key,
    title varchar(512) not null,
    history_group varchar(32) not null,
    created_at timestamptz not null,
    updated_at timestamptz not null
);

create table chat_messages (
    id varchar(128) primary key,
    chat_id varchar(128) not null references chats(id) on delete cascade,
    role varchar(32) not null,
    text text not null,
    mentions_json jsonb not null default '[]'::jsonb,
    citations_json jsonb not null default '[]'::jsonb,
    created_at timestamptz not null
);

create index idx_chat_messages_chat_id on chat_messages(chat_id);
create index idx_chats_updated_at on chats(updated_at desc);

create table documents (
    id varchar(128) primary key,
    title varchar(512) not null,
    type varchar(32) not null,
    year integer not null,
    author varchar(512) not null,
    description text not null,
    pages integer,
    status varchar(32) not null,
    indexed_at timestamptz not null,
    extracted_entities integer not null,
    storage_key varchar(1024),
    source_hash varchar(256),
    experiment_ids_json jsonb not null default '[]'::jsonb,
    material_ids_json jsonb not null default '[]'::jsonb,
    issue_ids_json jsonb not null default '[]'::jsonb
);

create index idx_documents_indexed_at on documents(indexed_at desc);
create index idx_documents_status on documents(status);

create table experiments (
    id varchar(128) primary key,
    title varchar(512) not null,
    material_id varchar(128) not null,
    material varchar(256) not null,
    material_details varchar(512) not null,
    temperature integer,
    duration varchar(128) not null,
    cooling_method varchar(256) not null,
    property varchar(256) not null,
    value_before varchar(128) not null,
    value_after varchar(128) not null,
    effect varchar(128) not null,
    equipment_id varchar(128),
    equipment varchar(256) not null,
    team_id varchar(128) not null,
    team varchar(256) not null,
    date date not null,
    source_document_id varchar(128) not null,
    source_name varchar(512) not null,
    source_page integer,
    confidence double precision not null,
    notes text not null
);

create index idx_experiments_material_id on experiments(material_id);
create index idx_experiments_source_document_id on experiments(source_document_id);

create table materials (
    id varchar(128) primary key,
    name varchar(256) not null,
    category varchar(256) not null,
    description text not null,
    aliases_json jsonb not null default '[]'::jsonb,
    composition_json jsonb not null default '[]'::jsonb,
    key_properties_json jsonb not null default '[]'::jsonb,
    experiment_ids_json jsonb not null default '[]'::jsonb,
    document_ids_json jsonb not null default '[]'::jsonb,
    issue_ids_json jsonb not null default '[]'::jsonb
);

create table data_issues (
    id varchar(128) primary key,
    type varchar(32) not null,
    severity varchar(32) not null,
    title varchar(512) not null,
    description text not null,
    recommendation text not null,
    detected_at timestamptz not null,
    related_entities_json jsonb not null default '[]'::jsonb
);

create index idx_data_issues_detected_at on data_issues(detected_at desc);
create index idx_data_issues_severity on data_issues(severity);

create table knowledge_entities (
    id varchar(128) primary key,
    type varchar(32) not null,
    title varchar(512) not null,
    subtitle varchar(512) not null,
    description text not null,
    position_x double precision not null,
    position_y double precision not null,
    attributes_json jsonb not null default '[]'::jsonb,
    sources_json jsonb not null default '[]'::jsonb
);

create index idx_knowledge_entities_type on knowledge_entities(type);

create table knowledge_connections (
    id varchar(128) primary key,
    source_id varchar(128) not null,
    target_id varchar(128) not null,
    label varchar(128) not null
);

create index idx_knowledge_connections_source on knowledge_connections(source_id);
create index idx_knowledge_connections_target on knowledge_connections(target_id);

create table extraction_drafts (
    id varchar(128) primary key,
    document_id varchar(128) not null unique references documents(id) on delete cascade,
    entities_json jsonb not null default '[]'::jsonb,
    relations_json jsonb not null default '[]'::jsonb,
    warnings_json jsonb not null default '[]'::jsonb,
    created_at timestamptz not null
);

create table ingestion_jobs (
    id varchar(128) primary key,
    document_id varchar(128) not null references documents(id) on delete cascade,
    type varchar(64) not null,
    status varchar(64) not null,
    progress integer not null,
    error_message text,
    created_at timestamptz not null,
    updated_at timestamptz not null
);

create index idx_ingestion_jobs_document_id on ingestion_jobs(document_id);
create index idx_ingestion_jobs_status on ingestion_jobs(status);
