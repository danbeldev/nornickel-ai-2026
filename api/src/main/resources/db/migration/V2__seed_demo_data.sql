insert into documents (
    id, title, type, year, author, description, pages, status, indexed_at, extracted_entities,
    experiment_ids_json, material_ids_json, issue_ids_json
) values
(
    'doc-t-2025-17', 'Отчет T-2025-17', 'PDF', 2025, 'Лаборатория термообработки',
    'Серия испытаний сплава X при 850 °C.', 42, 'READY', now() - interval '1 day', 2,
    '["EXP-0142"]'::jsonb, '["material-x"]'::jsonb, '["issue-unit-mismatch"]'::jsonb
),
(
    'doc-experiment-catalog-2024', 'Каталог экспериментов 2024', 'XLSX', 2024, 'Центр материаловедения',
    'Сводный каталог экспериментов по сплавам X, Y и Z.', null, 'READY', now() - interval '2 days', 2,
    '["EXP-0094"]'::jsonb, '["material-y"]'::jsonb, '["issue-missing-regime"]'::jsonb
);

insert into materials (
    id, name, category, description, aliases_json, composition_json, key_properties_json,
    experiment_ids_json, document_ids_json, issue_ids_json
) values
(
    'material-x', 'Сплав X', 'Никелевый жаропрочный сплав',
    'Исследуемый сплав с повышенным содержанием никеля и хрома.',
    '["X alloy"]'::jsonb,
    '[{"element":"Ni","percentage":"61.4 %"},{"element":"Cr","percentage":"18.2 %"}]'::jsonb,
    '[{"label":"Прочность после обработки","value":"485 МПа"}]'::jsonb,
    '["EXP-0142"]'::jsonb, '["doc-t-2025-17"]'::jsonb, '["issue-unit-mismatch"]'::jsonb
),
(
    'material-y', 'Сплав Y', 'Никель-кобальтовый сплав',
    'Материал для длительной эксплуатации под нагрузкой.',
    '[]'::jsonb,
    '[{"element":"Ni","percentage":"49.0 %"},{"element":"Co","percentage":"17.5 %"}]'::jsonb,
    '[{"label":"Твердость","value":"38 HRC"}]'::jsonb,
    '["EXP-0094"]'::jsonb, '["doc-experiment-catalog-2024"]'::jsonb, '["issue-missing-regime"]'::jsonb
);

insert into experiments (
    id, title, material_id, material, material_details, temperature, duration, cooling_method,
    property, value_before, value_after, effect, equipment_id, equipment, team_id, team,
    date, source_document_id, source_name, source_page, confidence, notes
) values
(
    'EXP-0142', 'Эксперимент 142', 'material-x', 'Сплав X', 'Карточка материала: Сплав X',
    850, '2 ч', 'Воздух', 'Предел прочности', '420 МПа', '485 МПа', '+15 %',
    'equipment-vn12', 'Печь ВН-12', 'team-thermal', 'Лаборатория термообработки',
    date '2025-03-14', 'doc-t-2025-17', 'Отчет T-2025-17', 18, 0.92,
    'Основная серия при 850 °C.'
),
(
    'EXP-0094', 'Старение сплава Y', 'material-y', 'Сплав Y', 'Карточка материала: Сплав Y',
    760, '6 ч', 'Печь', 'Твердость', '31 HRC', '38 HRC', '+7 HRC',
    null, 'Не указано', 'team-materials', 'Центр материаловедения',
    date '2024-11-05', 'doc-experiment-catalog-2024', 'Каталог экспериментов 2024', null, 0.88,
    'В каталоге не указан полный режим охлаждения.'
);

insert into data_issues (
    id, type, severity, title, description, recommendation, detected_at, related_entities_json
) values
(
    'issue-unit-mismatch', 'UNIT_MISMATCH', 'MEDIUM', 'Несопоставимые единицы твердости',
    'В связанных источниках встречаются HRC и HV без правила пересчета.',
    'Добавить стандарт пересчета или пометить измерения как несопоставимые.',
    now() - interval '5 hours',
    '[{"id":"material-x","label":"Сплав X","entityType":"material"},{"id":"doc-t-2025-17","label":"Отчет T-2025-17","entityType":"document"}]'::jsonb
),
(
    'issue-missing-regime', 'MISSING_DATA', 'HIGH', 'Не указан режим охлаждения',
    'Для части экспериментов сплава Y отсутствует охлаждающая среда.',
    'Проверить исходный каталог или запросить лабораторный журнал.',
    now() - interval '1 day',
    '[{"id":"EXP-0094","label":"EXP-0094","entityType":"experiment"}]'::jsonb
);

insert into knowledge_entities (
    id, type, title, subtitle, description, position_x, position_y, attributes_json, sources_json
) values
(
    'material-x', 'MATERIAL', 'Сплав X', 'Никелевый жаропрочный сплав',
    'Исследуемый сплав с повышенным содержанием никеля и хрома.', 460, 280,
    '[{"name":"Ni","value":61.4,"unit":"%"},{"name":"Cr","value":18.2,"unit":"%"}]'::jsonb,
    '[{"documentId":"doc-t-2025-17","page":4}]'::jsonb
),
(
    'EXP-0142', 'EXPERIMENT', 'Эксперимент 142', 'Термообработка образца',
    'Исследование влияния выдержки при высокой температуре на прочность.', 130, 110,
    '[{"name":"Дата","value":"14.03.2025"}]'::jsonb,
    '[{"documentId":"doc-t-2025-17","page":18}]'::jsonb
),
(
    'regime-850', 'REGIME', '850 °C · 2 часа', 'Режим термообработки',
    'Нагрев до 850 °C, выдержка 2 часа, охлаждение на воздухе.', 155, 330,
    '[{"name":"Температура","value":850,"unit":"°C"},{"name":"Выдержка","value":2,"unit":"ч"}]'::jsonb,
    '[{"documentId":"doc-t-2025-17","page":17}]'::jsonb
),
(
    'property-strength', 'PROPERTY', 'Предел прочности', '+15 % после обработки',
    'Максимальное напряжение до разрушения образца.', 770, 355,
    '[{"name":"До обработки","value":420,"unit":"МПа"},{"name":"После обработки","value":485,"unit":"МПа"}]'::jsonb,
    '[{"documentId":"doc-t-2025-17","page":18}]'::jsonb
),
(
    'issue-unit-mismatch', 'DATA_ISSUE', 'Несопоставимые единицы твердости', 'Проблема в данных',
    'Единицы HRC и HV используются без правила пересчета.', 1040, 480,
    '[{"name":"Серьезность","value":"medium"}]'::jsonb,
    '[{"documentId":"doc-t-2025-17","page":18}]'::jsonb
);

insert into knowledge_connections (id, source_id, target_id, label) values
('edge-exp-material', 'EXP-0142', 'material-x', 'USES_MATERIAL'),
('edge-exp-regime', 'EXP-0142', 'regime-850', 'USES_REGIME'),
('edge-exp-property', 'EXP-0142', 'property-strength', 'AFFECTS'),
('edge-issue-material', 'issue-unit-mismatch', 'material-x', 'RELATED_TO');

insert into chats (id, title, history_group, created_at, updated_at) values
('heat-treatment', 'Влияние термообработки на прочность', 'TODAY', now() - interval '2 hours', now() - interval '2 hours');

insert into chat_messages (id, chat_id, role, text, mentions_json, citations_json, created_at) values
(
    'heat-treatment-user-1', 'heat-treatment', 'USER',
    'Как термообработка влияет на прочность сплава X?',
    '[]'::jsonb, '[]'::jsonb, now() - interval '2 hours'
),
(
    'heat-treatment-assistant-1', 'heat-treatment', 'ASSISTANT',
    'В серии EXP-0142 обработка при 850 °C в течение двух часов дала прирост прочности с 420 до 485 МПа.',
    '[]'::jsonb,
    '[{"id":"citation-exp-142","entityId":"EXP-0142","entityType":"experiment","label":"EXP-0142","description":"Основная серия при 850 °C","page":null}]'::jsonb,
    now() - interval '119 minutes'
);
