import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { ChatMessage } from '../../data/types';
import { getEntityPath } from '../../utils/entityRoutes';
import { MarkdownMessage } from './MarkdownMessage';

interface ChatMessageItemProps {
  message: ChatMessage;
}

const formatDate = (value?: string) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const formatDuration = (milliseconds?: number) => {
  if (milliseconds == null) {
    return null;
  }
  if (milliseconds < 1000) {
    return `${milliseconds} мс`;
  }
  if (milliseconds < 60_000) {
    return `${(milliseconds / 1000).toLocaleString('ru-RU', {
      maximumFractionDigits: 1,
    })} с`;
  }
  const minutes = Math.floor(milliseconds / 60_000);
  const seconds = Math.round((milliseconds % 60_000) / 1000);
  return `${minutes} мин ${seconds} с`;
};

export const ChatMessageItem = ({ message }: ChatMessageItemProps) => {
  const isAssistant = message.role === 'assistant';
  const createdAt = formatDate(message.createdAt);
  const duration = formatDuration(message.generationDurationMs);
  const totalTokens =
    message.promptTokens != null || message.completionTokens != null
      ? (message.promptTokens ?? 0) + (message.completionTokens ?? 0)
      : null;

  return (
    <Stack
      direction="row"
      spacing={1.5}
      alignItems="flex-start"
      justifyContent={isAssistant ? 'flex-start' : 'flex-end'}
    >
      {isAssistant && (
        <Avatar
          sx={{
            width: 32,
            height: 32,
            color: 'primary.main',
            backgroundColor: 'rgba(79,209,197,.1)',
          }}
        >
          <AutoAwesomeRoundedIcon fontSize="small" />
        </Avatar>
      )}
      <Paper
        sx={{
          maxWidth: 760,
          px: 2,
          py: 1.5,
          border: '1px solid',
          borderColor: isAssistant ? 'divider' : 'rgba(79,209,197,.25)',
          borderRadius: 1.5,
          backgroundColor: isAssistant
            ? 'background.paper'
            : 'rgba(79,209,197,.08)',
        }}
      >
        {message.status === 'streaming' && !message.text ? (
          <Stack direction="row" alignItems="center" spacing={1}>
            <CircularProgress size={14} />
            <Typography variant="body2" color="text.secondary">
              Формирую ответ…
            </Typography>
          </Stack>
        ) : (
          <Box>
            <MarkdownMessage text={message.text} />
            {message.status === 'streaming' && (
              <Box
                component="span"
                sx={{
                  display: 'inline-block',
                  width: 2,
                  height: 16,
                  ml: 0.5,
                  verticalAlign: 'text-bottom',
                  backgroundColor: 'primary.main',
                }}
              />
            )}
          </Box>
        )}

        {(message.status === 'failed' ||
          message.status === 'interrupted') && (
          <Typography
            variant="caption"
            color="error.main"
            sx={{ display: 'block', mt: message.text ? 1 : 0 }}
          >
            {message.error ??
              (message.status === 'interrupted'
                ? 'Генерация была прервана'
                : 'Не удалось получить ответ')}
          </Typography>
        )}

        {message.mentions && message.mentions.length > 0 && (
          <Stack
            direction="row"
            useFlexGap
            flexWrap="wrap"
            gap={0.75}
            sx={{ mt: 1.5 }}
          >
            {message.mentions.map((mention) => (
              <Chip
                key={`${mention.type}-${mention.id}`}
                component={Link}
                to={getEntityPath(mention.type, mention.id)}
                clickable
                size="small"
                label={`@${mention.label}`}
                color="primary"
                variant="outlined"
              />
            ))}
          </Stack>
        )}

        {message.citations && message.citations.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 1.5 }} />
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={800}
            >
              ИСТОЧНИКИ И СВЯЗАННЫЕ ДАННЫЕ
            </Typography>
            <Stack spacing={0.75} sx={{ mt: 1 }}>
              {message.citations.map((citation) => (
                <Button
                  key={citation.id}
                  component={Link}
                  to={getEntityPath(
                    citation.entityType,
                    citation.entityId,
                  )}
                  color="inherit"
                  startIcon={<ArticleOutlinedIcon />}
                  endIcon={<OpenInNewRoundedIcon />}
                  sx={{
                    justifyContent: 'flex-start',
                    px: 1.25,
                    py: 0.8,
                    border: '1px solid',
                    borderColor: 'divider',
                    textAlign: 'left',
                  }}
                >
                  <Box minWidth={0} flex={1}>
                    <Typography variant="body2" fontWeight={700} noWrap>
                      {citation.label}
                      {citation.page ? ` · стр. ${citation.page}` : ''}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      noWrap
                      sx={{ display: 'block' }}
                    >
                      {citation.description}
                    </Typography>
                  </Box>
                </Button>
              ))}
            </Stack>
          </Box>
        )}

        {(createdAt || (isAssistant && message.status === 'completed') || duration) && (
          <Stack
            direction="row"
            useFlexGap
            flexWrap="wrap"
            gap={1}
            sx={{ mt: 1.25 }}
          >
            {createdAt && (
              <Typography variant="caption" color="text.disabled">
                {createdAt}
              </Typography>
            )}
            {isAssistant && message.status === 'completed' && (
              <Typography variant="caption" color="text.disabled">
                Токены:{' '}
                {totalTokens != null
                  ? totalTokens.toLocaleString('ru-RU')
                  : 'нет данных'}
              </Typography>
            )}
            {isAssistant &&
              (message.status === 'completed' || duration) && (
              <Typography variant="caption" color="text.disabled">
                Время ответа: {duration ?? 'нет данных'}
              </Typography>
            )}
          </Stack>
        )}
      </Paper>
      {!isAssistant && (
        <Avatar
          sx={{
            width: 32,
            height: 32,
            color: 'text.secondary',
            backgroundColor: '#18232D',
          }}
        >
          <PersonOutlineRoundedIcon fontSize="small" />
        </Avatar>
      )}
    </Stack>
  );
};
