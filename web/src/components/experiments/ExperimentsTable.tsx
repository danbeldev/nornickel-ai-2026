import {
  Box,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { ExperimentRecord } from '../../data/types';
import { experimentStatusConfig } from './experimentConfig';

interface ExperimentsTableProps {
  experiments: ExperimentRecord[];
  selectedId: string | null;
  onSelect: (experiment: ExperimentRecord) => void;
}

export const ExperimentsTable = ({
  experiments,
  selectedId,
  onSelect,
}: ExperimentsTableProps) => (
  <Paper
    sx={{
      height: '100%',
      minHeight: 480,
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
        Найдено записей: {experiments.length}
      </Typography>
    </Box>

    <TableContainer sx={{ maxHeight: 590 }}>
      <Table stickyHeader size="small" sx={{ minWidth: 980 }}>
        <TableHead>
          <TableRow>
            <TableCell>ID и материал</TableCell>
            <TableCell>Режим</TableCell>
            <TableCell>Свойство</TableCell>
            <TableCell>Результат</TableCell>
            <TableCell>Установка</TableCell>
            <TableCell>Источник</TableCell>
            <TableCell>Статус</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {experiments.map((experiment) => {
            const status = experimentStatusConfig[experiment.status];

            return (
              <TableRow
                key={experiment.id}
                hover
                selected={selectedId === experiment.id}
                onClick={() => onSelect(experiment)}
                sx={{
                  cursor: 'pointer',
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(79,209,197,.08)',
                  },
                }}
              >
                <TableCell>
                  <Typography variant="body2" fontWeight={800}>
                    {experiment.id}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {experiment.material}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {experiment.temperature} °C
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {experiment.duration} · {experiment.coolingMethod}
                  </Typography>
                </TableCell>
                <TableCell>{experiment.property}</TableCell>
                <TableCell>
                  <Typography
                    variant="body2"
                    fontWeight={800}
                    color={
                      experiment.effect.startsWith('−')
                        ? 'error.light'
                        : 'success.light'
                    }
                  >
                    {experiment.effect}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {experiment.valueBefore} → {experiment.valueAfter}
                  </Typography>
                </TableCell>
                <TableCell>{experiment.equipment}</TableCell>
                <TableCell>
                  <Typography variant="body2" noWrap maxWidth={190}>
                    {experiment.sourceName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    стр. {experiment.sourcePage}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={status.label}
                    color={status.color}
                    variant="outlined"
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  </Paper>
);
