import { Box, Stack, Typography } from '@mui/material';
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
    <Stack
      direction="row"
      useFlexGap
      flexWrap="wrap"
      gap={0.75}
    >
      {usages.map((usage) => (
        <Box
          key={usage.model}
          sx={{
            px: 1,
            py: 0.65,
            minWidth: 150,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            backgroundColor: 'rgba(255,255,255,.025)',
          }}
        >
          <Typography
            variant="caption"
            fontWeight={800}
            color="text.primary"
            sx={{ display: 'block', lineHeight: 1.35 }}
          >
            {modelLabel(usage.model)}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mt: 0.15, lineHeight: 1.35 }}
          >
            {usage.totalTokens.toLocaleString('ru-RU')} токенов
            {' · '}
            вход {usage.promptTokens.toLocaleString('ru-RU')}
            {' · '}
            выход {usage.completionTokens.toLocaleString('ru-RU')}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
};
