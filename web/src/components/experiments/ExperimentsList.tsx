import BiotechOutlinedIcon from '@mui/icons-material/BiotechOutlined';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import {
  Box,
  Chip,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import { ExperimentRecord } from '../../data/types';

interface ExperimentsListProps {
  experiments: ExperimentRecord[];
  selectedId: string | null;
  onSelect: (experiment: ExperimentRecord) => void;
}

const getRegimeLabel = (experiment: ExperimentRecord) => {
  const temperature =
    experiment.temperature == null
      ? 'температура не указана'
      : `${experiment.temperature} °C`;

  return `${experiment.material} · ${temperature} · ${experiment.property}`;
};

export const ExperimentsList = ({
  experiments,
  selectedId,
  onSelect,
}: ExperimentsListProps) => (
  <Paper
    sx={{
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 1.5,
      overflow: 'hidden',
    }}
  >
    <Box
      sx={{
        px: 2.5,
        py: 1.75,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography fontWeight={800}>Эксперименты</Typography>
      <Typography variant="caption" color="text.secondary">
        Найдено: {experiments.length}
      </Typography>
    </Box>

    <List disablePadding>
      {experiments.map((experiment) => (
        <ListItemButton
          key={experiment.id}
          selected={selectedId === experiment.id}
          onClick={() => onSelect(experiment)}
          sx={{
            minHeight: 74,
            px: 2.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
            '&:last-child': { borderBottom: 0 },
            '&.Mui-selected': {
              backgroundColor: 'rgba(79,209,197,.08)',
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 38, color: 'primary.main' }}>
            <BiotechOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary={experiment.title}
            secondary={getRegimeLabel(experiment)}
            slotProps={{
              primary: { noWrap: true, fontWeight: 800 },
              secondary: { noWrap: true },
            }}
          />
          <Chip
            size="small"
            label={
              experiment.effect && experiment.effect !== '—'
                ? experiment.effect
                : 'Нет результата'
            }
            variant="outlined"
            sx={{ display: { xs: 'none', xl: 'flex' }, mr: 1 }}
          />
          <ChevronRightRoundedIcon color="disabled" />
        </ListItemButton>
      ))}
    </List>
  </Paper>
);
