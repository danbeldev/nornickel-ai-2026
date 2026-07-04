import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { TokenUsageSummary } from '../common/TokenUsageSummary';
import { useState } from 'react';
import {
  DocumentExtractionResult,
  ExtractedEntity,
  ExtractedRelation,
} from '../../data/types';
import {
  getKnowledgeRelationLabel,
  knowledgeEntityConfig,
} from '../graph/graphConfig';
import api from '../../data/api';
import { ExtractionEntityEditorDialog } from './ExtractionEntityEditorDialog';
import { ExtractionRelationEditorDialog } from './ExtractionRelationEditorDialog';
import { ExtractionGraph } from './ExtractionGraph';

interface ExtractionPreviewProps {
  extraction: DocumentExtractionResult;
  onChange?: (extraction: DocumentExtractionResult) => void;
}

const visualTypeLabels = {
  table: 'Таблица',
  chart: 'График',
  diagram: 'Схема',
  image: 'Изображение',
};

export const ExtractionPreview = ({
  extraction,
  onChange,
}: ExtractionPreviewProps) => {
  const visualFragments = extraction.visualFragments ?? [];
  const [editing, setEditing] = useState(false);
  const [entityEditorOpen, setEntityEditorOpen] = useState(false);
  const [relationEditorOpen, setRelationEditorOpen] = useState(false);
  const [warningsExpanded, setWarningsExpanded] = useState(false);
  const [selectedEntity, setSelectedEntity] =
    useState<ExtractedEntity | undefined>();
  const [selectedRelation, setSelectedRelation] =
    useState<ExtractedRelation | undefined>();
  const defaultSource =
    extraction.entities[0]?.source ?? extraction.relations[0]?.source;
  const visibleWarnings = warningsExpanded
    ? extraction.warnings
    : extraction.warnings.slice(0, 3);

  const updateExtraction = (
    changes: Partial<
      Pick<DocumentExtractionResult, 'entities' | 'relations'>
    >,
  ) => {
    onChange?.({ ...extraction, ...changes });
  };

  const saveEntity = (entity: ExtractedEntity) => {
    const exists = extraction.entities.some((item) => item.id === entity.id);
    updateExtraction({
      entities: exists
        ? extraction.entities.map((item) =>
            item.id === entity.id ? entity : item,
          )
        : [...extraction.entities, entity],
    });
  };

  const deleteEntity = (entityId: string) => {
    updateExtraction({
      entities: extraction.entities.filter((entity) => entity.id !== entityId),
      relations: extraction.relations.filter(
        (relation) =>
          relation.sourceId !== entityId && relation.targetId !== entityId,
      ),
    });
  };

  const saveRelation = (relation: ExtractedRelation) => {
    const exists = extraction.relations.some(
      (item) => item.id === relation.id,
    );
    updateExtraction({
      relations: exists
        ? extraction.relations.map((item) =>
            item.id === relation.id ? relation : item,
          )
        : [...extraction.relations, relation],
    });
  };

  return (
    <Stack spacing={2}>
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      alignItems={{ sm: 'center' }}
      justifyContent="space-between"
      gap={1}
    >
      <Stack direction="row" useFlexGap flexWrap="wrap" gap={1}>
        <Chip label={`Сущностей: ${extraction.entities.length}`} />
        <Chip label={`Связей: ${extraction.relations.length}`} />
        <Chip label={`Визуальных фрагментов: ${visualFragments.length}`} />
        <Chip
          label={`Неопределённых: ${
            extraction.entities.filter((entity) => entity.type === 'unclassified')
              .length
          }`}
          color="warning"
          variant="outlined"
        />
      </Stack>
      {onChange && (
        <Button
          variant={editing ? 'contained' : 'outlined'}
          startIcon={<EditRoundedIcon />}
          onClick={() => setEditing((current) => !current)}
          sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}
        >
          {editing ? 'Завершить редактирование' : 'Редактировать черновик'}
        </Button>
      )}
    </Stack>
    {!!extraction.tokenUsage?.length && (
      <Stack
        spacing={0.5}
        sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
      >
        <Typography variant="caption" color="text.secondary" fontWeight={800}>
          ТОКЕНЫ ОБРАБОТКИ
        </Typography>
        <TokenUsageSummary usages={extraction.tokenUsage} />
      </Stack>
    )}

    {editing && (
      <Alert severity="info">
        Изменения сохранятся в черновике и будут отправлены при добавлении
        документа в граф. При удалении сущности удаляются и связанные с ней
        отношения.
      </Alert>
    )}

    {extraction.warnings.length > 0 && (
      <Stack spacing={1}>
        {visibleWarnings.map((warning, index) => (
          <Alert
            key={`${index}-${warning}`}
            severity="warning"
            icon={<WarningAmberRoundedIcon />}
          >
            {warning}
          </Alert>
        ))}
        {extraction.warnings.length > 3 && (
          <Button
            size="small"
            color="inherit"
            startIcon={
              warningsExpanded
                ? <ExpandLessRoundedIcon />
                : <ExpandMoreRoundedIcon />
            }
            onClick={() => setWarningsExpanded((current) => !current)}
            sx={{ alignSelf: 'flex-start', color: 'text.secondary' }}
          >
            {warningsExpanded
              ? 'Свернуть проблемы'
              : `Показать ещё ${extraction.warnings.length - 3}`}
          </Button>
        )}
      </Stack>
    )}

    <ExtractionGraph extraction={extraction} />

    {visualFragments.length > 0 && (
      <Box>
        <Typography fontWeight={800}>Таблицы, графики и изображения</Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'minmax(0, 1fr)',
              md: 'repeat(2, minmax(0, 1fr))',
            },
            gap: 1.25,
            mt: 1.25,
          }}
        >
          {visualFragments.map((fragment) => (
            <Paper
              key={fragment.id}
              variant="outlined"
              sx={{ overflow: 'hidden', borderRadius: 1.5 }}
            >
              {fragment.storageKey && (
                <Box
                  component="img"
                  src={api.getDocumentVisualUrl(
                    extraction.documentId,
                    fragment.id,
                  )}
                  alt={fragment.title}
                  loading="lazy"
                  sx={{
                    display: 'block',
                    width: '100%',
                    height: 220,
                    objectFit: 'contain',
                    backgroundColor: '#091119',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  }}
                />
              )}
              <Stack spacing={1} sx={{ p: 1.75 }}>
                <Stack
                  direction="row"
                  alignItems="flex-start"
                  justifyContent="space-between"
                  gap={1}
                >
                  <Box minWidth={0}>
                    <Typography variant="body2" fontWeight={800}>
                      {fragment.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {fragment.section ?? `Страница ${fragment.page}`}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    icon={<ImageOutlinedIcon />}
                    label={visualTypeLabels[fragment.type]}
                    variant="outlined"
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {fragment.description}
                </Typography>
                {fragment.estimated && (
                  <Alert severity="info">
                    Значения оценены по изображению и могут быть неточными.
                  </Alert>
                )}
                {fragment.structuredData && (
                  <Box
                    component="pre"
                    sx={{
                      m: 0,
                      p: 1.25,
                      maxHeight: 220,
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                      overflowWrap: 'anywhere',
                      typography: 'caption',
                      color: 'text.secondary',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      backgroundColor: 'rgba(255,255,255,.015)',
                    }}
                  >
                    {fragment.structuredData}
                  </Box>
                )}
              </Stack>
            </Paper>
          ))}
        </Box>
      </Box>
    )}

    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography fontWeight={800}>Извлечённые сущности</Typography>
        {editing && (
          <Button
            size="small"
            startIcon={<AddRoundedIcon />}
            onClick={() => {
              setSelectedEntity(undefined);
              setEntityEditorOpen(true);
            }}
          >
            Добавить сущность
          </Button>
        )}
      </Stack>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'minmax(0, 1fr)',
            md: 'repeat(2, minmax(0, 1fr))',
          },
          gap: 1.25,
          mt: 1.25,
        }}
      >
        {extraction.entities.map((entity) => {
          const config = knowledgeEntityConfig[entity.type];

          return (
            <Paper
              key={entity.id}
              variant="outlined"
              sx={{ p: 1.75, borderRadius: 1.5 }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="flex-start"
                spacing={1}
              >
                <Box minWidth={0}>
                  <Typography variant="body2" fontWeight={800}>
                    {entity.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    стр. {entity.source.page ?? '—'}
                    {entity.source.section
                      ? ` · ${entity.source.section}`
                      : ''}
                    {entity.source.visualType
                      ? ` · ${visualTypeLabels[entity.source.visualType]}`
                      : ''}
                  </Typography>
                </Box>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Chip
                    size="small"
                    label={config.label}
                    sx={{
                      color: config.color,
                      border: '1px solid',
                      borderColor: `${config.color}66`,
                      backgroundColor: `${config.color}12`,
                    }}
                  />
                  {editing && (
                    <>
                      <IconButton
                        size="small"
                        aria-label="Редактировать сущность"
                        onClick={() => {
                          setSelectedEntity(entity);
                          setEntityEditorOpen(true);
                        }}
                      >
                        <EditRoundedIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        aria-label="Удалить сущность"
                        onClick={() => deleteEntity(entity.id)}
                      >
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    </>
                  )}
                </Stack>
              </Stack>
              <Divider sx={{ my: 1.25 }} />
              <Stack spacing={0.75}>
                {entity.attributes.map((attribute) => (
                  <Stack
                    key={attribute.name}
                    direction="row"
                    justifyContent="space-between"
                    spacing={2}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {attribute.name}
                    </Typography>
                    <Typography variant="caption" fontWeight={700}>
                      {String(attribute.value)}
                      {attribute.unit ? ` ${attribute.unit}` : ''}
                    </Typography>
                  </Stack>
                ))}
                {entity.source.quote && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    «{entity.source.quote}»
                  </Typography>
                )}
              </Stack>
            </Paper>
          );
        })}
      </Box>
    </Box>

    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography fontWeight={800}>Найденные связи</Typography>
        {editing && (
          <Button
            size="small"
            startIcon={<AddRoundedIcon />}
            disabled={extraction.entities.length < 2}
            onClick={() => {
              setSelectedRelation(undefined);
              setRelationEditorOpen(true);
            }}
          >
            Добавить связь
          </Button>
        )}
      </Stack>
      <Stack spacing={0.75} sx={{ mt: 1.25 }}>
        {extraction.relations.map((relation) => {
          const source = extraction.entities.find(
            (entity) => entity.id === relation.sourceId,
          );
          const target = extraction.entities.find(
            (entity) => entity.id === relation.targetId,
          );

          return (
            <Paper
              key={relation.id}
              variant="outlined"
              sx={{ px: 1.5, py: 1, borderRadius: 1 }}
            >
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={1}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  useFlexGap
                  flexWrap="wrap"
                >
                  <Typography variant="body2" fontWeight={700}>
                    {source?.name ?? relation.sourceId}
                  </Typography>
                  <ArrowForwardRoundedIcon
                    sx={{ fontSize: 17, color: 'text.secondary' }}
                  />
                  <Chip
                    size="small"
                    label={getKnowledgeRelationLabel(relation.type)}
                    variant="outlined"
                  />
                  <ArrowForwardRoundedIcon
                    sx={{ fontSize: 17, color: 'text.secondary' }}
                  />
                  <Typography variant="body2" fontWeight={700}>
                    {target?.name ?? relation.targetId}
                  </Typography>
                </Stack>
                {editing && (
                  <Stack direction="row" spacing={0.5}>
                    <IconButton
                      size="small"
                      aria-label="Редактировать связь"
                      onClick={() => {
                        setSelectedRelation(relation);
                        setRelationEditorOpen(true);
                      }}
                    >
                      <EditRoundedIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      aria-label="Удалить связь"
                      onClick={() =>
                        updateExtraction({
                          relations: extraction.relations.filter(
                            (item) => item.id !== relation.id,
                          ),
                        })
                      }
                    >
                      <DeleteOutlineRoundedIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                )}
              </Stack>
            </Paper>
          );
        })}
      </Stack>
    </Box>
    <ExtractionEntityEditorDialog
      open={entityEditorOpen}
      entity={selectedEntity}
      documentId={extraction.documentId}
      defaultSource={defaultSource}
      onClose={() => setEntityEditorOpen(false)}
      onSave={saveEntity}
    />
    <ExtractionRelationEditorDialog
      open={relationEditorOpen}
      relation={selectedRelation}
      entities={extraction.entities}
      documentId={extraction.documentId}
      defaultSource={defaultSource}
      onClose={() => setRelationEditorOpen(false)}
      onSave={saveRelation}
    />
    </Stack>
  );
};
