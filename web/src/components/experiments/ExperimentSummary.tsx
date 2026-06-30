import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { Box, Paper, Stack, Typography } from '@mui/material';
import { ExperimentRecord } from '../../data/types';

interface ExperimentSummaryProps {
  experiments: ExperimentRecord[];
}

export const ExperimentSummary = ({
  experiments,
}: ExperimentSummaryProps) => {
  const cards = [
    {
      label: 'Всего экспериментов',
      value: experiments.length,
      icon: ScienceOutlinedIcon,
      color: '#4FD1C5',
    },
    {
      label: 'Проверено',
      value: experiments.filter((item) => item.status === 'verified').length,
      icon: CheckCircleOutlineRoundedIcon,
      color: '#65CE8D',
    },
    {
      label: 'Требует проверки',
      value: experiments.filter((item) => item.status === 'needs_review')
        .length,
      icon: WarningAmberRoundedIcon,
      color: '#F2B95D',
    },
    {
      label: 'Противоречия',
      value: experiments.filter((item) => item.status === 'conflict').length,
      icon: ErrorOutlineRoundedIcon,
      color: '#FF7B7B',
    },
  ];

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(2, minmax(0, 1fr))',
          xl: 'repeat(4, minmax(0, 1fr))',
        },
        gap: 1.5,
      }}
    >
      {cards.map(({ label, value, icon: Icon, color }) => (
        <Paper
          key={label}
          sx={{
            p: 1.75,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1.5,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                width: 36,
                height: 36,
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                color,
                borderRadius: 1,
                backgroundColor: `${color}14`,
              }}
            >
              <Icon fontSize="small" />
            </Box>
            <Box minWidth={0}>
              <Typography variant="h6" fontWeight={800} lineHeight={1.15}>
                {value}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {label}
              </Typography>
            </Box>
          </Stack>
        </Paper>
      ))}
    </Box>
  );
};
