import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { FormEvent, useState } from 'react';

interface ResearchSearchPanelProps {
  examples: string[];
  loading: boolean;
  onSearch: (query: string) => void;
}

export const ResearchSearchPanel = ({
  examples,
  loading,
  onSearch,
}: ResearchSearchPanelProps) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <Paper
      component="section"
      sx={{
        p: { xs: 2.5, md: 3.5 },
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1.5,
        background:
          'linear-gradient(135deg, rgba(79,209,197,.08), rgba(16,24,32,.92) 46%)',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1}>
        <AutoAwesomeRoundedIcon color="primary" fontSize="small" />
        <Typography variant="subtitle2" fontWeight={800}>
          Новый исследовательский запрос
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
        Опишите материал, условия эксперимента и интересующее свойство
      </Typography>

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          display: 'flex',
          gap: 1,
          mt: 2.5,
          p: 0.75,
          borderRadius: 1,
          border: '1px solid',
          borderColor: '#314352',
          backgroundColor: '#0A1118',
          '&:focus-within': {
            borderColor: 'primary.main',
            boxShadow: '0 0 0 3px rgba(79,209,197,.1)',
          },
        }}
      >
        <TextField
          fullWidth
          multiline
          maxRows={3}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Например: что уже делали со сплавом X при 850 °C и как изменялась прочность?"
          variant="standard"
          slotProps={{
            input: {
              disableUnderline: true,
              startAdornment: (
                <InputAdornment position="start">
                  <AutoAwesomeRoundedIcon color="primary" />
                </InputAdornment>
              ),
            },
            htmlInput: { 'aria-label': 'Исследовательский запрос' },
          }}
          sx={{
            px: 1.25,
            py: 0.4,
            '& .MuiInputBase-root': { minHeight: 48, fontSize: 15 },
          }}
        />
        <Button
          type="submit"
          variant="contained"
          disabled={!query.trim() || loading}
          endIcon={
            loading ? (
              <CircularProgress size={17} color="inherit" />
            ) : (
              <ArrowForwardRoundedIcon />
            )
          }
          sx={{ alignSelf: 'stretch', minWidth: { xs: 52, sm: 132 } }}
        >
          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
            Найти
          </Box>
        </Button>
      </Box>

      <Stack
        direction="row"
        useFlexGap
        flexWrap="wrap"
        alignItems="center"
        gap={1}
        sx={{ mt: 2 }}
      >
        <Button
          size="small"
          color="inherit"
          startIcon={<TuneRoundedIcon />}
          sx={{ color: 'text.secondary' }}
        >
          Фильтры
        </Button>
        {examples.slice(0, 2).map((example) => (
          <Chip
            key={example}
            label={example}
            size="small"
            variant="outlined"
            onClick={() => setQuery(example)}
            sx={{
              maxWidth: { xs: '100%', lg: 360 },
              color: 'text.secondary',
              borderColor: 'divider',
              '& .MuiChip-label': {
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              },
            }}
          />
        ))}
      </Stack>
    </Paper>
  );
};
