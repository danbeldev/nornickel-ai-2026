import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
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

interface ExtractionPreviewProps {
  extraction: DocumentExtractionResult;
}

export const ExtractionPreview = ({
  extraction,
}: ExtractionPreviewProps) => (
  <Stack spacing={2}>
    <Stack direction="row" useFlexGap flexWrap="wrap" gap={1}>
      <Chip label={`Сущностей: ${extraction.entities.length}`} />
      <Chip label={`Связей: ${extraction.relations.length}`} />
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
