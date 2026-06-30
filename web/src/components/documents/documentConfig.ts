import { DocumentStatus } from '../../data/types';

export const documentStatusConfig: Record<
  DocumentStatus,
  { label: string; color: 'success' | 'warning' | 'info' }
> = {
  indexed: { label: 'Проиндексирован', color: 'success' },
  processing: { label: 'Обрабатывается', color: 'info' },
  needs_review: { label: 'Требует проверки', color: 'warning' },
};
