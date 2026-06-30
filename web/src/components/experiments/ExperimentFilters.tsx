import FilterAltOffRoundedIcon from '@mui/icons-material/FilterAltOffRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import {
  Button,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
} from '@mui/material';

interface ExperimentFiltersProps {
  query: string;
  material: string;
  property: string;
  materials: string[];
  properties: string[];
  onQueryChange: (value: string) => void;
  onMaterialChange: (value: string) => void;
  onPropertyChange: (value: string) => void;
  onReset: () => void;
}

export const ExperimentFilters = ({
  query,
  material,
  property,
  materials,
  properties,
  onQueryChange,
  onMaterialChange,
  onPropertyChange,
  onReset,
}: ExperimentFiltersProps) => (
  <Paper
    sx={{
      p: 1.5,
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 1.5,
    }}
  >
    <Stack
      direction={{ xs: 'column', lg: 'row' }}
      alignItems={{ xs: 'stretch', lg: 'center' }}
      spacing={1.25}
    >
      <TextField
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Поиск по экспериментам"
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
        sx={{ minWidth: { lg: 280 }, flex: 1 }}
      />

      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel>Материал</InputLabel>
        <Select
          value={material}
          label="Материал"
          onChange={(event) => onMaterialChange(event.target.value)}
        >
          <MenuItem value="all">Все материалы</MenuItem>
          {materials.map((item) => (
            <MenuItem key={item} value={item}>
              {item}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel>Свойство</InputLabel>
        <Select
          value={property}
          label="Свойство"
          onChange={(event) => onPropertyChange(event.target.value)}
        >
          <MenuItem value="all">Все свойства</MenuItem>
          {properties.map((item) => (
            <MenuItem key={item} value={item}>
              {item}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Button
        color="inherit"
        startIcon={<FilterAltOffRoundedIcon />}
        onClick={onReset}
        sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}
      >
        Сбросить
      </Button>
    </Stack>
  </Paper>
);
