import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import {
  Alert,
  Box,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { DocumentExtractionResult } from '../../data/types';
import {
  getKnowledgeRelationLabel,
  knowledgeEntityConfig,
} from '../graph/graphConfig';
import api from '../../data/api';

interface ExtractionPreviewProps {
  extraction: DocumentExtractionResult;
}

const visualTypeLabels = {
  table: 'Таблица',
  chart: 'График',
  diagram: 'Схема',
  image: 'Изображение',
};

export const ExtractionPreview = ({
  extraction,
}: ExtractionPreviewProps) => {
  const visualFragments = extraction.visualFragments ?? [];

  return (
    <Stack spacing={2}>
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

    {extraction.warnings.map((warning) => (
      <Alert
        key={warning}
        severity="warning"
        icon={<WarningAmberRoundedIcon />}
      >
        {warning}
      </Alert>
    ))}

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
      <Typography fontWeight={800}>Извлечённые сущности</Typography>
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
      <Typography fontWeight={800}>Найденные связи</Typography>
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
              <Stack direction="row" alignItems="center" spacing={1}>
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
            </Paper>
          );
        })}
      </Stack>
    </Box>
    </Stack>
  );
};
