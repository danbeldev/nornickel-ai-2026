import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import {
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { DataIssueRecord } from '../../data/types';
import { getEntityPath } from '../../utils/entityRoutes';
import { issueSeverityConfig, issueTypeConfig } from './issueConfig';

interface DataIssueCardProps {
  issue: DataIssueRecord;
}

export const DataIssueCard = ({ issue }: DataIssueCardProps) => {
  const severity = issueSeverityConfig[issue.severity];
  const type = issueTypeConfig[issue.type];
  return (
    <Paper
      id={issue.id}
      sx={{
        p: 2.5,
        scrollMarginTop: '96px',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1.5,
      }}
    >
      <Stack direction="row" alignItems="flex-start" spacing={1.5}>
        <ErrorOutlineRoundedIcon color={severity.color} />
        <Box minWidth={0} flex={1}>
          <Stack direction="row" useFlexGap flexWrap="wrap" gap={0.75}>
            <Chip size="small" label={severity.label} color={severity.color} variant="outlined" />
            <Chip size="small" label={type.label} variant="outlined" />
          </Stack>
          <Typography variant="h6" fontWeight={800} sx={{ mt: 1.5 }}>
            {issue.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" lineHeight={1.7} sx={{ mt: 1 }}>
            {issue.description}
          </Typography>
          <Box
            sx={{
              mt: 2,
              p: 1.5,
              borderLeft: '2px solid',
              borderColor: 'primary.main',
              backgroundColor: 'rgba(79,209,197,.05)',
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Рекомендация
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {issue.recommendation}
            </Typography>
          </Box>
          <Stack direction="row" useFlexGap flexWrap="wrap" gap={0.75} sx={{ mt: 2 }}>
            {issue.relatedEntities.map((entity) => (
              <Button
                key={`${entity.entityType}-${entity.id}`}
                component={Link}
                to={getEntityPath(entity.entityType, entity.id)}
                size="small"
                color="inherit"
                endIcon={<ArrowForwardRoundedIcon />}
                sx={{ color: 'text.secondary' }}
              >
                {entity.label}
              </Button>
            ))}
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
};
