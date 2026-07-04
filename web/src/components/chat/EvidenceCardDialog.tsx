import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import HubOutlinedIcon from '@mui/icons-material/HubOutlined';
import LanguageRoundedIcon from '@mui/icons-material/LanguageRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { ChatCitation, MentionableEntityType } from '../../data/types';
import { getCitationPath } from '../../utils/citationRoutes';
import { getEntityPath } from '../../utils/entityRoutes';
import { knowledgeEntityConfig } from '../graph/graphConfig';
import {
  evidenceStatusConfig,
  getEvidenceStatus,
  sourceHasConflict,
} from './evidenceStatus';

interface EvidenceCardDialogProps {
  open: boolean;
  claim: string;
  sources: ChatCitation[];
  onClose: () => void;
}

const EvidenceSourceCard = ({
  source,
  conflicting,
}: {
  source: ChatCitation;
  conflicting: boolean;
}) => {
  const documentPath = getCitationPath(source);
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        height: '100%',
        borderRadius: 1,
        borderColor: conflicting ? 'warning.dark' : 'divider',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1}>
        {source.url ? (
          <LanguageRoundedIcon color="primary" fontSize="small" />
        ) : (
          <ArticleOutlinedIcon color="primary" fontSize="small" />
        )}
        <Box minWidth={0}>
          <Typography variant="body2" fontWeight={800} noWrap>
            {source.label.replaceAll('_', ' ')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {source.page ? `Страница ${source.page}` : 'Страница не указана'}
            {source.publishedAt ? ` · ${source.publishedAt}` : ''}
          </Typography>
        </Box>
      </Stack>

      <Typography
        variant="body2"
        lineHeight={1.65}
        sx={{ mt: 1.25, overflowWrap: 'anywhere' }}
      >
        «{source.quote ?? source.description}»
      </Typography>

      {source.url ? (
        <Button
          component="a"
          href={source.url}
          target="_blank"
          rel="noreferrer"
          size="small"
          endIcon={<OpenInNewRoundedIcon />}
          sx={{ mt: 1.25 }}
        >
          Открыть публикацию
        </Button>
      ) : documentPath ? (
        <Button
          component={Link}
          to={documentPath}
          size="small"
          endIcon={<OpenInNewRoundedIcon />}
          sx={{ mt: 1.25 }}
        >
          Открыть в документе
        </Button>
      ) : null}
    </Paper>
  );
};

export const EvidenceCardDialog = ({
  open,
  claim,
  sources,
  onClose,
}: EvidenceCardDialogProps) => {
  const status = getEvidenceStatus(claim, sources);
  const config = evidenceStatusConfig[status];
  const relatedEntities = Array.from(
    new Map(
      sources
        .flatMap((source) => source.relatedEntities ?? [])
        .map(
          (entity) =>
            [`${entity.type}:${entity.id}`, entity] as const,
        ),
    ).values(),
  );
  const importantTypes = new Set<MentionableEntityType>([
    'experiment',
    'material',
    'equipment',
    'property',
    'regime',
    'data_issue',
  ]);
  const visibleEntities = relatedEntities
    .filter((entity) => importantTypes.has(entity.type))
    .slice(0, 12);
  const explicitlyConflicting = sources.filter(sourceHasConflict);
  const supportingSources =
    status === 'conflicting' && explicitlyConflicting.length < sources.length
      ? sources.filter((source) => !sourceHasConflict(source))
      : status === 'conflicting'
        ? []
        : sources;
  const conflictingSources =
    status === 'conflicting'
      ? explicitlyConflicting.length
        ? explicitlyConflicting
        : sources
      : [];

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Карточка доказательства</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Paper
            variant="outlined"
            sx={{ p: 1.75, borderRadius: 1, backgroundColor: 'rgba(79,209,197,.04)' }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={800}
            >
              УТВЕРЖДЕНИЕ ИЗ ОТВЕТА
            </Typography>
            <Typography sx={{ mt: 0.75 }} lineHeight={1.65}>
              {claim || 'Утверждение не удалось выделить из ответа.'}
            </Typography>
          </Paper>

          <Box>
            <Chip
              label={config.label}
              color={config.color}
              variant={status === 'insufficient' ? 'outlined' : 'filled'}
              sx={{ borderRadius: 1 }}
            />
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.75 }}
            >
              {config.description}
            </Typography>
          </Box>

          {status === 'conflicting' && (
            <Alert severity="warning">
              Расхождение не означает автоматически, что один из источников ошибочен:
              сведения могут относиться к разным условиям. Окончательное решение
              остаётся за исследователем.
            </Alert>
          )}

          {supportingSources.length > 0 && (
            <Box>
              <Typography variant="subtitle2" fontWeight={800}>
                Подтверждающие источники
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    md: supportingSources.length > 1 ? '1fr 1fr' : '1fr',
                  },
                  gap: 1,
                  mt: 1,
                }}
              >
                {supportingSources.map((source) => (
                  <EvidenceSourceCard
                    key={source.id}
                    source={source}
                    conflicting={false}
                  />
                ))}
              </Box>
            </Box>
          )}

          {conflictingSources.length > 0 && (
            <Box>
              <Typography variant="subtitle2" fontWeight={800}>
                Противоречащие или уточняющие фрагменты
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    md: conflictingSources.length > 1 ? '1fr 1fr' : '1fr',
                  },
                  gap: 1,
                  mt: 1,
                }}
              >
                {conflictingSources.map((source) => (
                  <EvidenceSourceCard
                    key={source.id}
                    source={source}
                    conflicting
                  />
                ))}
              </Box>
            </Box>
          )}

          {visibleEntities.length > 0 && (
            <>
              <Divider />
              <Box>
                <Typography variant="subtitle2" fontWeight={800}>
                  Связанные данные графа
                </Typography>
                <Stack
                  direction="row"
                  useFlexGap
                  flexWrap="wrap"
                  gap={0.75}
                  sx={{ mt: 1 }}
                >
                  {visibleEntities.map((entity) => (
                    <Chip
                      key={`${entity.type}:${entity.id}`}
                      component={Link}
                      to={getEntityPath(entity.type, entity.id)}
                      clickable
                      icon={<HubOutlinedIcon />}
                      label={`${entity.label} · ${
                        knowledgeEntityConfig[entity.type].label
                      }`}
                      variant="outlined"
                      sx={{ borderRadius: 1 }}
                    />
                  ))}
                </Stack>
              </Box>
            </>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
};
