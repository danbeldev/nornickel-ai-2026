import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import BiotechOutlinedIcon from '@mui/icons-material/BiotechOutlined';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DeviceHubRoundedIcon from '@mui/icons-material/DeviceHubRounded';
import HexagonOutlinedIcon from '@mui/icons-material/HexagonOutlined';
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
import { ExperimentRecord } from '../../data/types';
import { experimentStatusConfig } from './experimentConfig';

interface ExperimentDetailsProps {
  experiment: ExperimentRecord | null;
  onClose: () => void;
}

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <Stack direction="row" justifyContent="space-between" spacing={2}>
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body2" fontWeight={700} textAlign="right">
      {value}
    </Typography>
  </Stack>
);

export const ExperimentDetails = ({
  experiment,
  onClose,
}: ExperimentDetailsProps) => {
  if (!experiment) {
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
        <BiotechOutlinedIcon color="primary" />
        <Typography fontWeight={800} sx={{ mt: 2 }}>
          Подробности эксперимента
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Выберите строку в таблице, чтобы увидеть режим, результат и источник
          извлечённых данных.
        </Typography>
      </Paper>
    );
  }

  const status = experimentStatusConfig[experiment.status];

  return (
    <Paper
      sx={{
        height: '100%',
        minHeight: 480,
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
            <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
              <Chip size="small" label={experiment.id} variant="outlined" />
              <Chip
                size="small"
                label={status.label}
                color={status.color}
                variant="outlined"
              />
            </Stack>
            <Typography variant="h6" fontWeight={800}>
              {experiment.title}
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose} aria-label="Закрыть">
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Box>

      <Divider />

      <Box sx={{ p: 2.5 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={800}>
          МАТЕРИАЛ И РЕЖИМ
        </Typography>
        <Stack spacing={1.4} sx={{ mt: 1.5 }}>
          <DetailRow label="Материал" value={experiment.material} />
          <DetailRow label="Состав" value={experiment.materialDetails} />
          <DetailRow
            label="Температура"
            value={`${experiment.temperature} °C`}
          />
          <DetailRow label="Длительность" value={experiment.duration} />
          <DetailRow label="Охлаждение" value={experiment.coolingMethod} />
          <DetailRow label="Установка" value={experiment.equipment} />
        </Stack>
      </Box>

      <Divider />

      <Box sx={{ p: 2.5 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={800}>
          РЕЗУЛЬТАТ
        </Typography>
        <Stack spacing={1.4} sx={{ mt: 1.5 }}>
          <DetailRow label="Свойство" value={experiment.property} />
          <DetailRow label="До" value={experiment.valueBefore} />
          <DetailRow label="После" value={experiment.valueAfter} />
          <DetailRow label="Эффект" value={experiment.effect} />
          <DetailRow
            label="Уверенность"
            value={`${Math.round(experiment.confidence * 100)}%`}
          />
        </Stack>
        <Typography
          variant="body2"
          color="text.secondary"
          lineHeight={1.65}
          sx={{ mt: 2 }}
        >
          {experiment.notes}
        </Typography>
      </Box>

      <Box sx={{ mt: 'auto', p: 2.5, pt: 0 }}>
        <Stack spacing={1}>
          <Button
            component={Link}
            to={`/materials/${experiment.materialId}`}
            fullWidth
            variant="outlined"
            startIcon={<HexagonOutlinedIcon />}
          >
            Открыть материал
          </Button>
          <Button
            component={Link}
            to={`/knowledge-graph?focus=${experiment.materialId}`}
            fullWidth
            variant="outlined"
            startIcon={<DeviceHubRoundedIcon />}
          >
            Показать в графе
          </Button>
          <Button
            component={Link}
            to={`/documents/${experiment.sourceDocumentId}`}
            fullWidth
            variant="outlined"
            startIcon={<ArticleOutlinedIcon />}
          >
            {experiment.sourceName}, стр. {experiment.sourcePage}
          </Button>
        </Stack>
      </Box>
    </Paper>
  );
};
