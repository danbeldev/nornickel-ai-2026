import { DocumentStatus } from '../../data/types';

export const documentStatusConfig: Record<
  DocumentStatus,
  { label: string; color: 'success' | 'error' | 'info' }
> = {
  ready: { label: 'Готов', color: 'success' },
  processing: { label: 'Обрабатывается', color: 'info' },
  error: { label: 'Ошибка обработки', color: 'error' },
};
