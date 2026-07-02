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
};

export const getKnowledgeRelationLabel = (relation: string) =>
    knowledgeRelationLabels[relation.toUpperCase()] ?? relation;
