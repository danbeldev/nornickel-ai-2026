alter table ingestion_jobs
    add column stage varchar(255);

update ingestion_jobs
set stage = case status
    when 'QUEUED' then 'Ожидает запуска фоновой обработки'
    when 'RUNNING' then 'Обработка документа'
    when 'READY_FOR_REVIEW' then 'Черновик готов к проверке'
    when 'PUBLISHED' then 'Данные опубликованы'
    when 'FAILED' then 'Обработка завершилась ошибкой'
    else 'Состояние обработки'
end;

alter table ingestion_jobs
    alter column stage set not null;
