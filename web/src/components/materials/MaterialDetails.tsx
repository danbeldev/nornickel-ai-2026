import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import BiotechOutlinedIcon from '@mui/icons-material/BiotechOutlined';
import DeviceHubRoundedIcon from '@mui/icons-material/DeviceHubRounded';
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

interface MaterialDetailsProps {
  material: MaterialRecord | null;
  experiments: ExperimentRecord[];
  documents: DocumentRecord[];
}

export const MaterialDetails = ({
  material,
  experiments,
  documents,
}: MaterialDetailsProps) => {
  if (!material) {
    return (
      <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
        <HexagonOutlinedIcon color="primary" />
        <Typography fontWeight={800} sx={{ mt: 2 }}>
          Карточка материала
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Выберите материал, чтобы увидеть состав и связанные данные.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1.5,
        overflow: 'hidden',
      }}
    >
      <Box sx={{ p: 2.5 }}>
        <Typography variant="h6" fontWeight={800}>
          {material.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {material.category}
        </Typography>
        <Typography variant="body2" lineHeight={1.7} sx={{ mt: 2 }}>
          {material.description}
        </Typography>
        <Stack direction="row" useFlexGap flexWrap="wrap" gap={0.75} sx={{ mt: 2 }}>
          {material.aliases.map((alias) => (
            <Chip key={alias} label={alias} size="small" variant="outlined" />
          ))}
        </Stack>
      </Box>

      <Divider />

      <Box sx={{ p: 2.5 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={800}>
          СОСТАВ
        </Typography>
        <Stack direction="row" useFlexGap flexWrap="wrap" gap={1} sx={{ mt: 1.5 }}>
          {material.composition.map((item) => (
            <Chip
              key={item.element}
              label={`${item.element} · ${item.percentage}`}
              color="primary"
              variant="outlined"
            />
          ))}
        </Stack>
        <Stack spacing={1.25} sx={{ mt: 2.5 }}>
          {material.keyProperties.map((property) => (
            <Stack
              key={property.label}
              direction="row"
              justifyContent="space-between"
              spacing={2}
            >
              <Typography variant="body2" color="text.secondary">
                {property.label}
              </Typography>
              <Typography variant="body2" fontWeight={700} textAlign="right">
                {property.value}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Box>

      <Divider />

      <Box sx={{ p: 2.5 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={800}>
          СВЯЗАННЫЕ ЭКСПЕРИМЕНТЫ
        </Typography>
        <Stack spacing={0.75} sx={{ mt: 1.25 }}>
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

      <Divider />

      <Box sx={{ p: 2.5 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={800}>
          ИСТОЧНИКИ
        </Typography>
        <Stack spacing={0.75} sx={{ mt: 1.25 }}>
          {documents.map((document) => (
            <Button
              key={document.id}
              component={Link}
              to={`/documents/${document.id}`}
              color="inherit"
              startIcon={<ArticleOutlinedIcon />}
              sx={{ justifyContent: 'flex-start', color: 'text.secondary' }}
            >
              {document.title}
            </Button>
          ))}
        </Stack>
        <Button
          component={Link}
          to={`/knowledge-graph?focus=${material.id}`}
          fullWidth
          variant="outlined"
          startIcon={<DeviceHubRoundedIcon />}
          sx={{ mt: 2 }}
        >
          Показать в графе
        </Button>
      </Box>
    </Paper>
  );
};
