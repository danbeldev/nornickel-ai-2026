import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import {
  Box,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import {
  ChatProcessingStage,
  ChatStatusEvent,
} from '../../data/types';

interface ChatStatusTimelineProps {
  events: ChatStatusEvent[];
  streaming: boolean;
  expanded: boolean;
}

const stageLabels: Record<ChatProcessingStage, string> = {
  request_received: 'Запрос принят',
  classifying_query: 'Определяю тип запроса',
  query_classified: 'Тип запроса определён',
  compressing_query: 'Уточняю follow-up по истории',
  rewriting_query: 'Оптимизирую запрос для поиска',
  validating_query: 'Проверяю ID и числа',
  transformation_rejected: 'Преобразование отклонено',
  query_ready: 'Поисковый запрос подготовлен',
  retrieving_knowledge: 'Ищу знания в графе',
  knowledge_retrieved: 'Поиск по базе завершён',
  generating_response: 'Формирую ответ',
  response_completed: 'Ответ готов',
  failed: 'Обработка завершилась ошибкой',
  interrupted: 'Обработка прервана',
};

const formatDuration = (start: string, end?: string) => {
  if (!end) return null;
  const duration = new Date(end).getTime() - new Date(start).getTime();
  if (!Number.isFinite(duration) || duration < 0) return null;
  if (duration < 1000) return `${duration} мс`;
  return `${(duration / 1000).toLocaleString('ru-RU', {
    maximumFractionDigits: 1,
  })} с`;
};

const isFailure = (stage: ChatProcessingStage) =>
  stage === 'failed' ||
  stage === 'interrupted' ||
  stage === 'transformation_rejected';

export const ChatStatusTimeline = ({
  events,
  streaming,
  expanded,
}: ChatStatusTimelineProps) => {
  const visibleEvents = expanded
    ? events
    : streaming
      ? events.slice(-1)
      : [];
  if (visibleEvents.length === 0) return null;

  return (
    <Box
      sx={{
        mb: 1.25,
        ...(expanded
          ? {
              p: 1.25,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              backgroundColor: 'rgba(255,255,255,.018)',
            }
          : {
              px: 0.25,
            }),
      }}
    >
      {expanded && (
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1 }}>
          <AccessTimeRoundedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="caption" color="text.secondary" fontWeight={800}>
            ХОД ОБРАБОТКИ
          </Typography>
        </Stack>
      )}

      <Stack spacing={1}>
        {visibleEvents.map((event) => {
          const originalIndex = events.indexOf(event);
          const next = events[originalIndex + 1];
          const duration = formatDuration(event.timestamp, next?.timestamp);
          const isCurrent = streaming && originalIndex === events.length - 1;
          const failed = isFailure(event.stage);

          return (
            <Stack
              key={`${event.stage}-${event.timestamp}-${originalIndex}`}
              direction="row"
              spacing={1}
              alignItems="flex-start"
            >
              <Box sx={{ pt: 0.2, width: 16, flexShrink: 0 }}>
                {isCurrent ? (
                  <CircularProgress size={13} />
                ) : failed ? (
                  <ErrorOutlineRoundedIcon
                    sx={{ fontSize: 15, color: 'warning.main' }}
                  />
                ) : (
                  <CheckRoundedIcon
                    sx={{ fontSize: 15, color: 'success.main' }}
                  />
                )}
              </Box>
              <Box minWidth={0} flex={1}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={{ xs: 0, sm: 0.75 }}
                  alignItems={{ sm: 'baseline' }}
                >
                  <Typography variant="caption" fontWeight={700}>
                    {stageLabels[event.stage]}
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    {duration ?? (isCurrent ? 'текущий этап' : '')}
                  </Typography>
                </Stack>
                {event.message && (
                  <Typography
                    variant="caption"
                    color={failed ? 'warning.main' : 'text.secondary'}
                    sx={{ display: 'block', mt: 0.2, overflowWrap: 'anywhere' }}
                  >
                    {event.message}
                  </Typography>
                )}
              </Box>
            </Stack>
          );
        })}
      </Stack>
    </Box>
  );
};
