import { Stack, Typography } from '@mui/material';
import { ModelTokenUsage } from '../../data/types';

interface TokenUsageSummaryProps {
  usages?: ModelTokenUsage[];
  emptyLabel?: string;
}

const modelLabel = (model: string) => {
  const normalized = model.toLocaleLowerCase('ru-RU');
  if (normalized.includes('yandexgpt-5-lite')) return 'YandexGPT Lite';
  if (normalized.includes('yandexgpt-5.1')) return 'YandexGPT 5.1';
  if (normalized.includes('text-embeddings-v2-doc')) {
    return 'Yandex Embeddings · документы';
  }
  if (normalized.includes('text-embeddings-v2-query')) {
    return 'Yandex Embeddings · поиск';
  }
  const parts = model.split('/').filter(Boolean);
  const shortName = parts[parts.length - 1];
  return shortName || model;
};

export const TokenUsageSummary = ({
  usages,
  emptyLabel = 'Нет данных о токенах',
}: TokenUsageSummaryProps) => {
  if (!usages?.length) {
    return (
      <Typography variant="caption" color="text.disabled">
        {emptyLabel}
      </Typography>
    );
  }

  return (
    <Stack spacing={0.25}>
      {usages.map((usage) => (
        <Typography
          key={usage.model}
          variant="caption"
          color="text.secondary"
        >
          <Typography component="span" variant="inherit" fontWeight={700}>
            {modelLabel(usage.model)}
          </Typography>
          {`: ${usage.totalTokens.toLocaleString('ru-RU')} токенов`}
          {' · '}
          вход {usage.promptTokens.toLocaleString('ru-RU')}
          {' · '}
          выход {usage.completionTokens.toLocaleString('ru-RU')}
        </Typography>
      ))}
    </Stack>
  );
};
