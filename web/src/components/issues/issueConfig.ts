import { DataIssueSeverity, DataIssueType } from '../../data/types';

export const issueTypeConfig: Record<DataIssueType, { label: string }> = {
  missing_data: { label: 'Неполные данные' },
  conflict: { label: 'Противоречие' },
  unit_mismatch: { label: 'Несовместимые единицы' },
  unexplored_range: { label: 'Неизученная область' },
};

export const issueSeverityConfig: Record<
  DataIssueSeverity,
  { label: string; color: 'error' | 'warning' | 'info' }
> = {
  high: { label: 'Высокий приоритет', color: 'error' },
  medium: { label: 'Средний приоритет', color: 'warning' },
  low: { label: 'Низкий приоритет', color: 'info' },
};
