import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import DeviceHubRoundedIcon from '@mui/icons-material/DeviceHubRounded';
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChatMessage } from '../../data/types';
import { getEntityPath } from '../../utils/entityRoutes';
import { knowledgeEntityConfig } from '../graph/graphConfig';
import { AnswerGraphDialog } from './AnswerGraphDialog';
import { ChatResearchProgress } from './ChatResearchProgress';
import { MarkdownMessage } from './MarkdownMessage';
import { PromptDetailsDialog } from './PromptDetailsDialog';
import { ThinkingDuration } from './ThinkingDuration';

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

export const ChatMessageItem = ({ message }: ChatMessageItemProps) => {
  const [promptOpen, setPromptOpen] = useState(false);
  const [graphOpen, setGraphOpen] = useState(false);
  const [sourcesExpanded, setSourcesExpanded] = useState(false);
  const isAssistant = message.role === 'assistant';
  const citations = message.citations ?? [];
  const citationKeys = new Set(
    citations.map(
      (citation) => `${citation.entityType}:${citation.entityId}`,
    ),
  );
  const evidenceEntities = (message.evidence?.entities ?? []).filter(
    (entity) => !citationKeys.has(`${entity.type}:${entity.id}`),
  );
  const sourceCount = evidenceEntities.length + citations.length;
  const visibleEntities = sourcesExpanded
    ? evidenceEntities
    : evidenceEntities.slice(0, 3);
  const visibleCitations = sourcesExpanded
    ? citations
    : citations.slice(0, Math.max(0, 3 - visibleEntities.length));
  const createdAt = formatDate(message.createdAt);
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
        {isAssistant && (
          <ThinkingDuration
            status={message.status}
            createdAt={message.createdAt}
            durationMs={message.generationDurationMs}
          />
        )}

        {isAssistant && message.status === 'streaming' && (
          <ChatResearchProgress
            status={message.researchStatus}
            evidence={message.evidence}
          />
        )}

        {message.text && (
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

        {(sourceCount > 0 || message.evidence) && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 1.5 }} />

            {sourceCount > 0 && (
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={800}
                >
                  ИСТОЧНИКИ
                </Typography>
                <Stack spacing={0.75} sx={{ mt: 0.75 }}>
                  {visibleEntities.map((entity) => (
                    <Button
                      key={`${entity.type}-${entity.id}`}
                      component={Link}
                      to={getEntityPath(entity.type, entity.id)}
                      color="inherit"
                      startIcon={<DeviceHubRoundedIcon />}
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
                          {entity.label}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          noWrap
                          sx={{ display: 'block' }}
                        >
                          {
                            knowledgeEntityConfig[
                              entity.type ?? 'unclassified'
                            ].label
                          }
                        </Typography>
                      </Box>
                    </Button>
                  ))}
                  {visibleCitations.map((citation) => (
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
                  {sourceCount > 3 && (
                    <Button
                      color="inherit"
                      variant="outlined"
                      startIcon={
                        sourcesExpanded
                          ? <ExpandLessRoundedIcon />
                          : <ExpandMoreRoundedIcon />
                      }
                      onClick={() =>
                        setSourcesExpanded((current) => !current)
                      }
                      sx={{
                        justifyContent: 'flex-start',
                        px: 1.25,
                        py: 0.8,
                        color: 'text.secondary',
                      }}
                    >
                      {sourcesExpanded
                        ? 'Свернуть источники'
                        : `Показать ещё ${sourceCount - 3}`}
                    </Button>
                  )}
                </Stack>
              </Box>
            )}

            {message.evidence && (
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                sx={{ mt: sourceCount > 0 ? 1.5 : 0 }}
              >
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<HelpOutlineRoundedIcon />}
                  onClick={() => setPromptOpen(true)}
                >
                  Почему такой ответ?
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<DeviceHubRoundedIcon />}
                  disabled={message.evidence.entities.length === 0}
                  onClick={() => setGraphOpen(true)}
                >
                  Показать граф
                </Button>
              </Stack>
            )}
          </Box>
        )}

        {(createdAt || (isAssistant && message.status === 'completed')) && (
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
      {message.evidence && (
        <>
          <PromptDetailsDialog
            open={promptOpen}
            evidence={message.evidence}
            onClose={() => setPromptOpen(false)}
          />
          <AnswerGraphDialog
            open={graphOpen}
            evidence={message.evidence}
            onClose={() => setGraphOpen(false)}
          />
        </>
      )}
    </Stack>
  );
};
