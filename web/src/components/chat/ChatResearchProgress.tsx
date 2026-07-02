import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import {
  Box,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { ChatEvidence, ChatResearchStatus } from '../../data/types';

interface ChatResearchProgressProps {
  status?: ChatResearchStatus;
  evidence?: ChatEvidence;
}

const statusLabels: Record<ChatResearchStatus, string> = {
  preparing: 'Подготавливаю исследовательский запрос',
  retrieving: 'Ищу данные в графе знаний',
  retrieved: 'Контекст найден',
  generating: 'Формирую ответ',
};

export const ChatResearchProgress = ({
  status = 'preparing',
  evidence,
}: ChatResearchProgressProps) => {
  const documentCount = new Set(
    evidence?.contexts.map((context) => context.documentId) ?? [],
  ).size;
  const visibleContexts = evidence?.contexts.slice(0, 3) ?? [];

  return (
    <Box
      sx={{
        mb: 1.25,
        p: 1.25,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        backgroundColor: 'rgba(79,209,197,.035)',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1}>
        <CircularProgress size={15} />
        <Typography variant="body2" fontWeight={700}>
          {statusLabels[status]}…
        </Typography>
      </Stack>

      {evidence && (
        <>
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.75}
            sx={{ mt: 1 }}
          >
            <CheckCircleRoundedIcon
              color="success"
              sx={{ fontSize: 16 }}
            />
            <Typography variant="caption" color="text.secondary">
              Найдено: {evidence.entities.length} сущностей,{' '}
              {evidence.contexts.length} фрагментов в {documentCount} документах,{' '}
              {evidence.paths.length} связей
            </Typography>
          </Stack>
          {visibleContexts.length > 0 && (
            <Box sx={{ mt: 0.75, pl: 2.9 }}>
              <Typography variant="caption" color="text.secondary">
                Читаю контекст:
              </Typography>
              {visibleContexts.map((context) => (
                <Typography
                  key={context.chunkId}
                  variant="caption"
                  color="text.secondary"
                  noWrap
                  sx={{ display: 'block' }}
                >
                  {context.documentTitle}
                  {context.page ? ` · стр. ${context.page}` : ''}
                  {context.section ? ` · ${context.section}` : ''}
                </Typography>
              ))}
            </Box>
          )}
        </>
      )}
    </Box>
  );
};
