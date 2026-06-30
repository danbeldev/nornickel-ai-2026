import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import BiotechOutlinedIcon from '@mui/icons-material/BiotechOutlined';
import DeviceHubRoundedIcon from '@mui/icons-material/DeviceHubRounded';
import HexagonOutlinedIcon from '@mui/icons-material/HexagonOutlined';
import { Box, Paper, Stack, Typography } from '@mui/material';
import { DashboardStat } from '../../data/types';

const icons = {
  documents: ArticleOutlinedIcon,
  experiments: BiotechOutlinedIcon,
  materials: HexagonOutlinedIcon,
  relations: DeviceHubRoundedIcon,
};

interface DashboardStatsProps {
  stats: DashboardStat[];
}

export const DashboardStats = ({ stats }: DashboardStatsProps) => (
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
    {stats.map((stat) => {
      const Icon = icons[stat.icon];

      return (
        <Paper
          key={stat.id}
          sx={{
            p: 2,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1.5,
            backgroundColor: 'background.paper',
          }}
        >
          <Stack direction="row" justifyContent="space-between" spacing={1}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                {stat.label}
              </Typography>
              <Typography variant="h5" fontWeight={800} sx={{ mt: 0.35 }}>
                {stat.value}
              </Typography>
            </Box>
            <Box
              sx={{
                width: 38,
                height: 38,
                display: 'grid',
                placeItems: 'center',
                borderRadius: 1,
                color: 'primary.main',
                backgroundColor: 'rgba(79,209,197,.09)',
              }}
            >
              <Icon fontSize="small" />
            </Box>
          </Stack>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mt: 1.5 }}
          >
            {stat.detail}
          </Typography>
        </Paper>
      );
    })}
  </Box>
);
