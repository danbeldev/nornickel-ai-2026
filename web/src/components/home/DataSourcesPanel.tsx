import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import SyncRoundedIcon from '@mui/icons-material/SyncRounded';
import { Box, Button, Divider, Paper, Stack, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { DataSource } from '../../data/types';

interface DataSourcesPanelProps {
  sources: DataSource[];
}

export const DataSourcesPanel = ({ sources }: DataSourcesPanelProps) => (
  <Paper
    component="section"
    sx={{ height: '100%', border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}
  >
    <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Typography fontWeight={800}>Источники данных</Typography>
      <Typography variant="caption" color="text.secondary">
        Состояние индексации
      </Typography>
    </Box>
    <Box sx={{ px: 2.5 }}>
      {sources.map((source, index) => (
        <Box key={source.id}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={2}
            sx={{ py: 2 }}
          >
            <Box>
              <Typography variant="body2" fontWeight={700}>
                {source.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {source.type} · {source.documents.toLocaleString('ru-RU')}
              </Typography>
            </Box>
            {source.status === 'indexed' ? (
              <CheckCircleRoundedIcon sx={{ color: '#59D499' }} fontSize="small" />
            ) : (
              <SyncRoundedIcon color="secondary" fontSize="small" />
            )}
          </Stack>
          {index < sources.length - 1 && <Divider />}
        </Box>
      ))}
    </Box>
    <Button
      component={Link}
      to="/documents"
      fullWidth
      endIcon={<ArrowForwardRoundedIcon />}
      sx={{
        justifyContent: 'space-between',
        px: 2.5,
        py: 1.5,
        borderTop: '1px solid',
        borderColor: 'divider',
        borderRadius: 0,
      }}
    >
      Открыть документы
    </Button>
  </Paper>
);
