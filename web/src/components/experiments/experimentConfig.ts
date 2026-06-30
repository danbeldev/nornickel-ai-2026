import { ExperimentStatus } from '../../data/types';

export const experimentStatusConfig: Record<
  ExperimentStatus,
  { label: string; color: 'success' | 'warning' | 'error' }
> = {
  verified: { label: 'Проверено', color: 'success' },
  needs_review: { label: 'Требует проверки', color: 'warning' },
  conflict: { label: 'Противоречие', color: 'error' },
};
