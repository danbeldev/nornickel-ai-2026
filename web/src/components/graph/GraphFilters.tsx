import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import {
  Box,
  Chip,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  KnowledgeEntityType,
  KnowledgeGraphEntity,
} from '../../data/types';
import { knowledgeEntityConfig } from './graphConfig';

interface GraphFiltersProps {
  entities: KnowledgeGraphEntity[];
  query: string;
  activeTypes: Set<KnowledgeEntityType>;
  onQueryChange: (query: string) => void;
  onToggleType: (type: KnowledgeEntityType) => void;
}

export const GraphFilters = ({
  entities,
  query,
  activeTypes,
  onQueryChange,
  onToggleType,
}: GraphFiltersProps) => (
  <Paper
    sx={{
      display: 'flex',
      flexDirection: { xs: 'column', lg: 'row' },
      alignItems: { xs: 'stretch', lg: 'center' },
      gap: 1.5,
      p: 1.5,
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 1.5,
    }}
  >
    <TextField
      value={query}
      onChange={(event) => onQueryChange(event.target.value)}
      placeholder="Найти сущность в графе"
      size="small"
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchRoundedIcon fontSize="small" />
            </InputAdornment>
          ),
        },
      }}
      sx={{ width: { xs: '100%', lg: 280 }, flexShrink: 0 }}
    />

    <Stack
      direction="row"
      alignItems="center"
      useFlexGap
      flexWrap="wrap"
      gap={0.75}
    >
      <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
        Показывать:
      </Typography>
      {(
        Object.entries(knowledgeEntityConfig) as Array<
          [
            KnowledgeEntityType,
            (typeof knowledgeEntityConfig)[KnowledgeEntityType],
          ]
        >
      ).map(([type, config]) => {
        const count = entities.filter((entity) => entity.type === type).length;
        const active = activeTypes.has(type);

        return (
          <Chip
            key={type}
            size="small"
            label={`${config.label} · ${count}`}
            variant={active ? 'filled' : 'outlined'}
            onClick={() => onToggleType(type)}
            sx={{
              color: active ? config.color : 'text.secondary',
              borderColor: active ? `${config.color}66` : 'divider',
              backgroundColor: active ? `${config.color}14` : 'transparent',
              '&:hover': {
                backgroundColor: `${config.color}20`,
              },
            }}
          />
        );
      })}
    </Stack>
  </Paper>
);
