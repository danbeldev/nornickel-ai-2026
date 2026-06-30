import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import { Box, Button, Divider, Paper, Stack, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { DataIssueRecord } from '../../data/types';

const severityColors = {
  high: '#FF7B7B',
  medium: '#F2B95D',
  low: '#6C8CFF',
};

interface DataIssuesPanelProps {
  issues: DataIssueRecord[];
}

export const DataIssuesPanel = ({ issues }: DataIssuesPanelProps) => (
  <Paper
    component="section"
    sx={{
      height: '100%',
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 1.5,
      overflow: 'hidden',
    }}
  >
    <Stack
      direction="row"
      alignItems="center"
      spacing={1}
      sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}
    >
      <ErrorOutlineRoundedIcon color="secondary" fontSize="small" />
      <Box>
        <Typography fontWeight={800}>Проблемы в данных</Typography>
        <Typography variant="caption" color="text.secondary">
          Последние обнаруженные проблемы
        </Typography>
      </Box>
    </Stack>

    <Box sx={{ px: 2.5 }}>
      {issues.map((issue, index) => (
        <Box key={issue.id}>
          <Stack
            component={Link}
            to={`/data-issues#${issue.id}`}
            direction="row"
            spacing={1.5}
            sx={{
              py: 2.25,
              color: 'inherit',
              textDecoration: 'none',
              '&:hover .issue-title': { color: 'primary.main' },
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                mt: 0.75,
                flexShrink: 0,
                borderRadius: '50%',
                backgroundColor: severityColors[issue.severity],
                boxShadow: `0 0 10px ${severityColors[issue.severity]}66`,
              }}
            />
            <Box>
              <Typography
                className="issue-title"
                variant="body2"
                fontWeight={700}
                lineHeight={1.45}
              >
                {issue.title}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mt: 0.5 }}
              >
                {issue.description}
              </Typography>
            </Box>
          </Stack>
          {index < issues.length - 1 && <Divider />}
        </Box>
      ))}
    </Box>

    <Button
      component={Link}
      to="/data-issues"
      fullWidth
      endIcon={<ArrowForwardRoundedIcon />}
      sx={{
        justifyContent: 'space-between',
        px: 2.5,
        py: 1.75,
        borderTop: '1px solid',
        borderColor: 'divider',
        borderRadius: 0,
      }}
    >
      Посмотреть все
    </Button>
  </Paper>
);
