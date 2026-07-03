import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import HexagonOutlinedIcon from '@mui/icons-material/HexagonOutlined';
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import { MaterialRecord } from '../../data/types';

interface MaterialsListProps {
  materials: MaterialRecord[];
  totalCount?: number;
  selectedId: string | null;
  onSelect: (material: MaterialRecord) => void;
}

export const MaterialsList = ({
  materials,
  totalCount = materials.length,
  selectedId,
  onSelect,
}: MaterialsListProps) => (
  <Paper
    sx={{
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 1.5,
      overflow: 'hidden',
    }}
  >
    <Box sx={{ px: 2.5, py: 1.75, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Typography fontWeight={800}>Материалы</Typography>
      <Typography variant="caption" color="text.secondary">
        Найдено: {totalCount}
      </Typography>
    </Box>
    <List disablePadding>
      {materials.map((material) => (
        <ListItemButton
          key={material.id}
          selected={selectedId === material.id}
          onClick={() => onSelect(material)}
          sx={{
            minHeight: 68,
            px: 2.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
            '&:last-child': { borderBottom: 0 },
            '&.Mui-selected': { backgroundColor: 'rgba(79,209,197,.08)' },
          }}
        >
          <ListItemIcon sx={{ minWidth: 38, color: 'primary.main' }}>
            <HexagonOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary={material.name}
            secondary={`${material.category} · ${material.experimentIds.length} экспериментов`}
            slotProps={{
              primary: { fontWeight: 800 },
              secondary: { noWrap: true },
            }}
          />
          <ChevronRightRoundedIcon color="disabled" />
        </ListItemButton>
      ))}
    </List>
  </Paper>
);
