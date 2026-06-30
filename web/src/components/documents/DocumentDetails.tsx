import BiotechOutlinedIcon from '@mui/icons-material/BiotechOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import HexagonOutlinedIcon from '@mui/icons-material/HexagonOutlined';
import {
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { Link } from 'react-router-dom';
import {
  DocumentRecord,
  ExperimentRecord,
  MaterialRecord,
} from '../../data/types';
import { documentStatusConfig } from './documentConfig';

interface DocumentDetailsProps {
  document: DocumentRecord | null;
  experiments: ExperimentRecord[];
  materials: MaterialRecord[];
}

export const DocumentDetails = ({
  document,
  experiments,
  materials,
}: DocumentDetailsProps) => {
  if (!document) {
    return (
      <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
        <DescriptionOutlinedIcon color="primary" />
        <Typography fontWeight={800} sx={{ mt: 2 }}>
          Карточка документа
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Выберите документ, чтобы увидеть извлечённые сущности и связи.
        </Typography>
      </Paper>
    );
  }

  const status = documentStatusConfig[document.status];

  return (
    <Paper sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden' }}>
      <Box sx={{ p: 2.5 }}>
        <Stack direction="row" useFlexGap flexWrap="wrap" gap={0.75} sx={{ mb: 1.5 }}>
          <Chip label={document.type.toUpperCase()} size="small" variant="outlined" />
          <Chip label={status.label} size="small" color={status.color} variant="outlined" />
        </Stack>
        <Typography variant="h6" fontWeight={800}>
          {document.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {document.author} · {document.year}
        </Typography>
        <Typography variant="body2" lineHeight={1.7} sx={{ mt: 2 }}>
          {document.description}
        </Typography>
      </Box>

      <Divider />

      <Box sx={{ p: 2.5 }}>
        <Stack spacing={1.25}>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">Страницы</Typography>
            <Typography variant="body2" fontWeight={700}>{document.pages ?? '—'}</Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">Извлечено сущностей</Typography>
            <Typography variant="body2" fontWeight={700}>{document.extractedEntities}</Typography>
          </Stack>
        </Stack>
      </Box>

      <Divider />

      <Box sx={{ p: 2.5 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={800}>
          МАТЕРИАЛЫ
        </Typography>
        <Stack spacing={0.5} sx={{ mt: 1 }}>
          {materials.map((material) => (
            <Button
              key={material.id}
              component={Link}
              to={`/materials/${material.id}`}
              color="inherit"
              startIcon={<HexagonOutlinedIcon />}
              sx={{ justifyContent: 'flex-start', color: 'text.secondary' }}
            >
              {material.name}
            </Button>
          ))}
        </Stack>
      </Box>

      <Divider />

      <Box sx={{ p: 2.5 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={800}>
          ЭКСПЕРИМЕНТЫ
        </Typography>
        <Stack spacing={0.5} sx={{ mt: 1 }}>
          {experiments.map((experiment) => (
            <Button
              key={experiment.id}
              component={Link}
              to={`/experiments/${experiment.id}`}
              color="inherit"
              startIcon={<BiotechOutlinedIcon />}
              sx={{ justifyContent: 'flex-start', color: 'text.secondary' }}
            >
              {experiment.id} · {experiment.property}
            </Button>
          ))}
        </Stack>
      </Box>
    </Paper>
  );
};
