import { DocumentStatus } from '../../data/types';

export const documentStatusConfig: Record<
  DocumentStatus,
  { label: string; color: 'success' | 'error' | 'info' | 'warning' }
> = {
  ready: { label: 'Готов', color: 'success' },
  processing: { label: 'Обрабатывается', color: 'info' },
  canceled: { label: 'Обработка отменена', color: 'warning' },
  error: { label: 'Ошибка обработки', color: 'error' },
};
