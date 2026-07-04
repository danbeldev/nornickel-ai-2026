import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import DeviceHubRoundedIcon from '@mui/icons-material/DeviceHubRounded';
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import LanguageRoundedIcon from '@mui/icons-material/LanguageRounded';
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
import { getCitationPath } from '../../utils/citationRoutes';
import { knowledgeEntityConfig } from '../graph/graphConfig';
import { AnswerGraphDialog } from './AnswerGraphDialog';
import { ChatStatusTimeline } from './ChatStatusTimeline';
import { MarkdownMessage } from './MarkdownMessage';
import { PromptDetailsDialog } from './PromptDetailsDialog';
import { ThinkingDuration } from './ThinkingDuration';
import { ChatExportMenu } from './ChatExportMenu';
import api from '../../data/api';
import { TokenUsageSummary } from '../common/TokenUsageSummary';

interface ChatMessageItemProps {
  message: ChatMessage;
  inlineSourcesEnabled?: boolean;
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

export const ChatMessageItem = ({
  message,
  inlineSourcesEnabled = true,
}: ChatMessageItemProps) => {
  const [promptOpen, setPromptOpen] = useState(false);
  const [graphOpen, setGraphOpen] = useState(false);
  const [sourcesExpanded, setSourcesExpanded] = useState(false);
  const [statusesExpanded, setStatusesExpanded] = useState(false);
  const isAssistant = message.role === 'assistant';
  const citations = message.citations ?? [];
  const citationKeys = new Set(
    citations
      .filter((citation) => citation.entityType && citation.entityId)
      .map(
        (citation) => `${citation.entityType}:${citation.entityId}`,
      ),
  );
  const evidenceEntities = (message.evidence?.entities ?? []).filter(
    (entity) => !citationKeys.has(`${entity.type}:${entity.id}`),
  );
  const sourceCount = citations.length;
  const entityCount = evidenceEntities.length;
  const sourceItemCount = sourceCount + entityCount;
  const visibleCitations = sourcesExpanded
    ? citations
    : citations.slice(0, 3);
  const visibleEntities = sourcesExpanded
    ? evidenceEntities
    : evidenceEntities.slice(0, Math.max(0, 3 - visibleCitations.length));
  const createdAt = formatDate(message.createdAt);

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
            expanded={statusesExpanded}
            onToggle={() => setStatusesExpanded((current) => !current)}
          />
        )}

        {isAssistant && (
          <ChatStatusTimeline
            events={message.statusHistory ?? []}
            streaming={message.status === 'streaming'}
            expanded={statusesExpanded}
          />
        )}

        {message.text && (
          <Box>
            <MarkdownMessage
              text={message.text}
              citations={citations}
              inlineSourcesEnabled={inlineSourcesEnabled}
            />
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

        {(sourceItemCount > 0 || message.evidence) && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 1.5 }} />

            {sourceItemCount > 0 && (
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={800}
                >
                  ИСТОЧНИКИ · {sourceCount}
                  {entityCount > 0
                    ? ` · сущностей в контексте: ${entityCount}`
                    : ''}
                </Typography>
                <Stack spacing={0.75} sx={{ mt: 0.75 }}>
                  {visibleCitations.map((citation) => {
                    const content = (
                      <>
                        {citation.visualId && citation.entityId && (
                          <Box
                            component="img"
                            src={api.getDocumentVisualUrl(
                              citation.entityId,
                              citation.visualId,
                            )}
                            alt={citation.label}
                            loading="lazy"
                            sx={{
                              width: 64,
                              height: 48,
                              flexShrink: 0,
                              mr: 1,
                              objectFit: 'cover',
                              borderRadius: 0.75,
                              backgroundColor: '#091119',
                            }}
                          />
                        )}
                        <Box minWidth={0} flex={1}>
                          <Typography variant="body2" fontWeight={700} noWrap>
                            {citation.label.replaceAll('_', ' ')}
                            {citation.page ? ` · стр. ${citation.page}` : ''}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            noWrap
                            sx={{ display: 'block' }}
                          >
                            {citation.publishedAt
                              ? `${citation.publishedAt} · `
                              : ''}
                            {citation.url
                              ?? citation.quote
                              ?? citation.description}
                          </Typography>
                          {citation.url && (
                            <Typography
                              variant="caption"
                              color="text.disabled"
                              noWrap
                              sx={{ display: 'block' }}
                            >
                              {citation.quote ?? citation.description}
                            </Typography>
                          )}
                        </Box>
                      </>
                    );
                    const commonSx = {
                      justifyContent: 'flex-start',
                      px: 1.25,
                      py: 0.8,
                      border: '1px solid',
                      borderColor: 'divider',
                      textAlign: 'left',
                    } as const;
                    if (citation.url) {
                      return (
                        <Button
                          key={citation.id}
                          component="a"
                          href={citation.url}
                          target="_blank"
                          rel="noreferrer"
                          color="inherit"
                          startIcon={<LanguageRoundedIcon />}
                          endIcon={<OpenInNewRoundedIcon />}
                          sx={commonSx}
                        >
                          {content}
                        </Button>
                      );
                    }
                    if (!citation.entityType || !citation.entityId) {
                      return null;
                    }
                    return (
                      <Button
                        key={citation.id}
                        component={Link}
                        to={
                          getCitationPath(citation)
                            ?? getEntityPath(
                              citation.entityType,
                              citation.entityId,
                            )
                        }
                        color="inherit"
                        startIcon={
                          citation.visualId
                            ? <ImageOutlinedIcon />
                            : <ArticleOutlinedIcon />
                        }
                        endIcon={<OpenInNewRoundedIcon />}
                        sx={commonSx}
                      >
                        {content}
                      </Button>
                    );
                  })}
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
                  {sourceItemCount > 3 && (
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
                        : `Показать ещё ${sourceItemCount - 3}`}
                    </Button>
                  )}
                </Stack>
              </Box>
            )}

            {message.evidence && (
              <>
                {(message.evidence.recommendations ?? []).length > 0 && (
                  <Box sx={{ mt: sourceItemCount > 0 ? 1.5 : 0 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight={800}
                    >
                      РЕКОМЕНДАЦИИ
                    </Typography>
                    <Stack
                      direction="row"
                      useFlexGap
                      flexWrap="wrap"
                      gap={0.75}
                      sx={{ mt: 0.75 }}
                    >
                      {message.evidence.recommendations.map((item) => (
                        <Chip
                          key={item.id}
                          component={Link}
                          to={getEntityPath(item.type, item.id)}
                          clickable
                          size="small"
                          label={item.label}
                          title={item.reason}
                          variant="outlined"
                        />
                      ))}
                    </Stack>
                  </Box>
                )}
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  sx={{ mt: 1.5 }}
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
              </>
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
              <>
                <TokenUsageSummary
                  usages={message.tokenUsage}
                  emptyLabel="Нет данных о токенах"
                />
                <ChatExportMenu message={message} />
              </>
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
