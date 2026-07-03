import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import {
  Box,
  Chip,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { DataIssueCard } from '../../components/issues/DataIssueCard';
import { ListPagination } from '../../components/common/ListPagination';
import { WorkspaceLayout } from '../../components/layout/WorkspaceLayout';
import api from '../../data/api';
import { DataIssueRecord, DataIssueSeverity } from '../../data/types';
import { issueSeverityConfig } from '../../components/issues/issueConfig';

const PAGE_SIZE = 6;

export const DataIssuesPage = () => {
  const { hash } = useLocation();
  const [issues, setIssues] = useState<DataIssueRecord[] | null>(null);
  const [activeSeverities, setActiveSeverities] = useState<
    Set<DataIssueSeverity>
  >(new Set<DataIssueSeverity>(['high', 'medium', 'low']));
  const [page, setPage] = useState(1);

  useEffect(() => {
    api.getDataIssues().then(setIssues);
  }, []);

  const filteredIssues = useMemo(
    () =>
      (issues ?? []).filter((issue) => activeSeverities.has(issue.severity)),
    [activeSeverities, issues],
  );

  useEffect(() => {
    setPage(1);
  }, [activeSeverities]);

  useEffect(() => {
    if (!issues || !hash) return;
    const issueIndex = filteredIssues.findIndex(
      (issue) => issue.id === hash.slice(1),
    );
    if (issueIndex < 0) return;

    const targetPage = Math.floor(issueIndex / PAGE_SIZE) + 1;
    if (targetPage !== page) {
      setPage(targetPage);
      return;
    }

    document
      .getElementById(hash.slice(1))
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [filteredIssues, hash, issues, page]);

  const toggleSeverity = (severity: DataIssueSeverity) => {
    setActiveSeverities((current) => {
      const next = new Set(current);

      if (next.has(severity)) next.delete(severity);
      else next.add(severity);

      return next;
    });
  };

  const paginatedIssues = filteredIssues.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  return (
    <WorkspaceLayout>
      <Box sx={{ px: { xs: 2, sm: 3, xl: 4 }, py: { xs: 3, md: 3.5 } }}>
        <Typography variant="caption" color="text.secondary">
          База знаний / Проблемы в данных
        </Typography>
        <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mt: 0.5 }}>
          <ErrorOutlineRoundedIcon color="secondary" />
          <Typography component="h1" variant="h4" fontWeight={800}>
            Проблемы в данных
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Неполные сведения, противоречия и неизученные области, обнаруженные
          при анализе общей базы знаний
        </Typography>

        {issues ? (
          <>
            <Stack direction="row" useFlexGap flexWrap="wrap" gap={1} sx={{ mt: 2.5 }}>
              {(
                Object.entries(issueSeverityConfig) as Array<
                  [
                    DataIssueSeverity,
                    (typeof issueSeverityConfig)[DataIssueSeverity],
                  ]
                >
              ).map(([severity, config]) => (
                <Chip
                  key={severity}
                  label={`${config.label} · ${
                    issues.filter((issue) => issue.severity === severity).length
                  }`}
                  color={config.color}
                  variant={activeSeverities.has(severity) ? 'filled' : 'outlined'}
                  onClick={() => toggleSeverity(severity)}
                />
              ))}
            </Stack>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'minmax(0, 1fr)',
                  xl: 'repeat(2, minmax(0, 1fr))',
                },
                gap: 2,
                mt: 2,
              }}
            >
              {paginatedIssues.map((issue) => (
                <DataIssueCard key={issue.id} issue={issue} />
              ))}
            </Box>
            <ListPagination
              page={page}
              pageSize={PAGE_SIZE}
              totalItems={filteredIssues.length}
              onChange={setPage}
            />
          </>
        ) : (
          <Stack spacing={2} sx={{ mt: 3 }}>
            <Skeleton variant="rounded" height={48} />
            <Skeleton variant="rounded" height={280} />
            <Skeleton variant="rounded" height={280} />
          </Stack>
        )}
      </Box>
    </WorkspaceLayout>
  );
};
