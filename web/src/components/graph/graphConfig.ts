import { KnowledgeEntityType } from '../../data/types';

export const knowledgeEntityConfig: Record<
    KnowledgeEntityType,
    { label: string; color: string }
> = {
    material: { label: 'Материалы', color: '#4FD1C5' },
    experiment: { label: 'Эксперименты', color: '#6C8CFF' },
    property: { label: 'Свойства', color: '#F2B95D' },
    regime: { label: 'Режимы', color: '#B586F5' },
    equipment: { label: 'Установки', color: '#5BBCE5' },
    document: { label: 'Документы', color: '#8FA4B5' },
    team: { label: 'Команды', color: '#65CE8D' },
    conclusion: { label: 'Выводы', color: '#F07F9B' },
    process: { label: 'Процессы', color: '#8BD3C7' },
    publication: { label: 'Публикации', color: '#A7C7E7' },
    expert: { label: 'Эксперты', color: '#FFD166' },
    facility: { label: 'Площадки', color: '#90BE6D' },
    technology: { label: 'Технологии', color: '#F8961E' },
    geography: { label: 'География', color: '#43AA8B' },
    economic_indicator: { label: 'Экономика', color: '#F9C74F' },
    data_issue: { label: 'Проблемы данных', color: '#FF8A65' },
    unclassified: { label: 'Неопределённые', color: '#A7B0B8' },
};

const knowledgeRelationLabels: Record<string, string> = {
    USES_MATERIAL: 'использует материал',
    USER_MATERIAL: 'использует материал',
    USES_REGIME: 'использует режим',
    AFFECTS: 'влияет на',
    MEASURES: 'измеряет',
    USES_EQUIPMENT: 'использует оборудование',
    PERFORMED_BY: 'выполнен командой',
    PRODUCES_CONCLUSION: 'формирует вывод',
    BASED_ON: 'основан на',
    RELATED_TO: 'связан с',
    COMPARED_WITH: 'сравнивается с',
    USES: 'использует',
    USES_PROCESS: 'использует процесс',
    DESCRIBED_IN: 'описано в',
    DESCRIBES: 'описывает',
    AUTHORED_BY: 'подготовлено экспертом',
    EXPERT_IN: 'эксперт в',
    AFFILIATED_WITH: 'состоит в',
    LOCATED_IN: 'находится в',
    IMPLEMENTED_AT: 'внедрено на',
    APPLIES_TO: 'применяется к',
    PRODUCES_OUTPUT: 'производит',
    VALIDATED_BY: 'подтверждено',
    HAS_ECONOMIC_INDICATOR: 'имеет экономический показатель',
    CONTRADICTS: 'противоречит',
};

export const knowledgeRelationTypes = Object.keys(knowledgeRelationLabels)
    .filter((type) => type !== 'USER_MATERIAL');

export const getKnowledgeRelationLabel = (relation: string) =>
    knowledgeRelationLabels[relation.toUpperCase()] ?? relation;
