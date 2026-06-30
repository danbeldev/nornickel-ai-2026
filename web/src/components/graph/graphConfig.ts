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
};
