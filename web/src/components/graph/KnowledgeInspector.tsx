import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import HubOutlinedIcon from '@mui/icons-material/HubOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import CallMergeRoundedIcon from '@mui/icons-material/CallMergeRounded';
import {
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { Link } from 'react-router-dom';
import {
  KnowledgeGraphEntity,
  KnowledgeGraphConnection,
  UpdateKnowledgeEntityRequest,
} from '../../data/types';
import api from '../../data/api';
import { knowledgeEntityConfig } from './graphConfig';
import { KnowledgeEntityEditorDialog } from './KnowledgeEntityEditorDialog';
import { KnowledgeHistoryDialog } from './KnowledgeHistoryDialog';
import { useState } from 'react';
import { KnowledgeRelationsPanel } from './KnowledgeRelationsPanel';
import { KnowledgeMergeDialog } from './KnowledgeMergeDialog';

interface KnowledgeInspectorProps {
  entity: KnowledgeGraphEntity | null;
  totalEntities: number;
  totalConnections: number;
  onClose: () => void;
  onEntityUpdated?: (entity: KnowledgeGraphEntity) => void;
  entities?: KnowledgeGraphEntity[];
  connections?: KnowledgeGraphConnection[];
  onGraphChanged?: () => void;
}

export const KnowledgeInspector = ({
  entity,
  totalEntities,
  totalConnections,
  onClose,
  onEntityUpdated,
  entities = [],
  connections = [],
  onGraphChanged = () => undefined,
}: KnowledgeInspectorProps) => {
  const [editorOpen, setEditorOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);

  if (!entity) {
    return (
      <Paper
        sx={{
          height: '100%',
          minHeight: 260,
          p: 2.5,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1.5,
        }}
      >
        <HubOutlinedIcon color="primary" />
        <Typography fontWeight={800} sx={{ mt: 2 }}>
          Сведения о графе
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Выберите узел, чтобы увидеть его свойства, связи и источники.
        </Typography>
        <Stack direction="row" spacing={3} sx={{ mt: 3 }}>
          <Box>
            <Typography variant="h5" fontWeight={800}>
              {totalEntities}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              сущностей
            </Typography>
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800}>
              {totalConnections}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              связей
            </Typography>
          </Box>
        </Stack>
      </Paper>
    );
  }

  const config = knowledgeEntityConfig[entity.type];
  const canEditEntity = entity.type !== 'document';
  const entityPath =
    entity.type === 'material'
      ? `/materials/${entity.id}`
      : entity.type === 'experiment'
        ? `/experiments/${entity.id}`
        : entity.type === 'document'
          ? `/documents/${entity.id}`
          : null;

  return (
    <Paper
      sx={{
        height: '100%',
        minHeight: 400,
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1.5,
        overflow: 'hidden',
      }}
    >
      <Box sx={{ p: 2.5 }}>
        <Stack direction="row" alignItems="flex-start" spacing={1}>
          <Box minWidth={0} flex={1}>
            <Chip
              size="small"
              label={config.label}
              sx={{
                mb: 1.5,
                color: config.color,
                border: '1px solid',
                borderColor: `${config.color}66`,
                backgroundColor: `${config.color}12`,
              }}
            />
            <Typography variant="h6" fontWeight={800}>
              {entity.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {entity.subtitle}
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose} aria-label="Закрыть">
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
        <Typography variant="body2" lineHeight={1.7} sx={{ mt: 2.5 }}>
          {entity.description}
        </Typography>
        <Stack direction="row" spacing={0.75} sx={{ mt: 2 }}>
          <Chip
            size="small"
            label={`Достоверность ${Math.round((entity.confidence ?? 0) * 100)}%`}
            variant="outlined"
          />
          <Chip
            size="small"
            label={`Версия ${entity.version ?? 1}`}
            variant="outlined"
          />
          {entity.geography && (
            <Chip size="small" label={entity.geography} variant="outlined" />
          )}
        </Stack>
      </Box>

      <Divider />

      <Box sx={{ p: 2.5 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          fontWeight={700}
          textTransform="uppercase"
          letterSpacing=".08em"
        >
          Свойства
        </Typography>
        <Stack spacing={1.5} sx={{ mt: 1.5 }}>
          {entity.attributes.map((attribute) => (
            <Stack
              key={attribute.name}
              direction="row"
              justifyContent="space-between"
              spacing={2}
            >
              <Typography variant="body2" color="text.secondary">
                {attribute.name}
              </Typography>
              <Typography variant="body2" fontWeight={700} textAlign="right">
                {String(attribute.value)}
                {attribute.unit ? ` ${attribute.unit}` : ''}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Box>

      <KnowledgeRelationsPanel
        entity={entity}
        entities={entities}
        connections={connections}
        onChanged={onGraphChanged}
      />

      <Box sx={{ mt: 'auto', p: 2.5, pt: 0 }}>
        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
          {canEditEntity && (
            <Button
              fullWidth
              variant="outlined"
              startIcon={<EditOutlinedIcon />}
              onClick={() => setEditorOpen(true)}
            >
              Проверить
            </Button>
          )}
          <Button
            fullWidth
            variant="outlined"
            startIcon={<HistoryRoundedIcon />}
            onClick={() => setHistoryOpen(true)}
          >
            История
          </Button>
        </Stack>
        {canEditEntity && (
          <Button
            fullWidth
            color="inherit"
            startIcon={<CallMergeRoundedIcon />}
            onClick={() => setMergeOpen(true)}
            sx={{ mb: 1, color: 'text.secondary' }}
          >
            Объединить дубль
          </Button>
        )}
        <Stack spacing={1} sx={{ mb: entityPath ? 1 : 0 }}>
          {entity.sources.map((source) => (
            <Box
              key={`${source.documentId}-${source.chunkId ?? source.page ?? 'document'}`}
            >
              <Button
                component={Link}
                to={`/documents/${source.documentId}`}
                fullWidth
                color="inherit"
                startIcon={<ArticleOutlinedIcon />}
                sx={{ justifyContent: 'flex-start', color: 'text.secondary' }}
              >
                Источник
                {source.page ? ` · стр. ${source.page}` : ''}
                {source.section ? ` · ${source.section}` : ''}
              </Button>
              {source.quote && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', px: 1, pb: 0.75 }}
                >
                  «{source.quote}»
                </Typography>
              )}
            </Box>
          ))}
        </Stack>
        {entityPath && (
          <Button
            component={Link}
            to={entityPath}
            fullWidth
            variant="outlined"
            startIcon={<ArticleOutlinedIcon />}
          >
            Открыть карточку
          </Button>
        )}
      </Box>
      <KnowledgeEntityEditorDialog
        open={editorOpen}
        entity={entity}
        saving={saving}
        onClose={() => setEditorOpen(false)}
        onSave={async (request: UpdateKnowledgeEntityRequest) => {
          setSaving(true);
          try {
            const updated = await api.updateKnowledgeEntity(entity.id, request);
            onEntityUpdated?.(updated);
            setEditorOpen(false);
          } finally {
            setSaving(false);
          }
        }}
      />
      <KnowledgeHistoryDialog
        open={historyOpen}
        entityId={entity.id}
        onClose={() => setHistoryOpen(false)}
      />
      <KnowledgeMergeDialog
        open={mergeOpen}
        entity={entity}
        entities={entities}
        onClose={() => setMergeOpen(false)}
        onMerged={onGraphChanged}
      />
    </Paper>
  );
};
