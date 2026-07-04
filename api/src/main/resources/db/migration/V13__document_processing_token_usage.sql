alter table documents
    add column processing_prompt_tokens integer,
    add column processing_completion_tokens integer,
    add column processing_total_tokens integer;
