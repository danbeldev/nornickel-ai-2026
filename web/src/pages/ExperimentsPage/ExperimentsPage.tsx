import BiotechOutlinedIcon from '@mui/icons-material/BiotechOutlined';
import { Box, Skeleton, Stack, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ExperimentDetails } from '../../components/experiments/ExperimentDetails';
import { ExperimentFilters } from '../../components/experiments/ExperimentFilters';
import { ExperimentsList } from '../../components/experiments/ExperimentsList';
import { ExperimentSummary } from '../../components/experiments/ExperimentSummary';
import { WorkspaceLayout } from '../../components/layout/WorkspaceLayout';
import api from '../../data/api';
import { ExperimentRecord } from '../../data/types';

export const ExperimentsPage = () => {
  const { experimentId } = useParams<{ experimentId: string }>();
  const navigate = useNavigate();
  const [experiments, setExperiments] = useState<ExperimentRecord[] | null>(
    null,
  );
  const [query, setQuery] = useState('');
  const [material, setMaterial] = useState('all');
  const [property, setProperty] = useState('all');

  useEffect(() => {
    api.getExperiments().then(setExperiments);
  }, []);

  const selectedExperiment =
    experiments?.find((experiment) => experiment.id === experimentId) ?? null;

  const materials = useMemo(
    () =>
      Array.from(new Set((experiments ?? []).map((item) => item.material))).sort(),
    [experiments],
  );
  const properties = useMemo(
    () =>
      Array.from(new Set((experiments ?? []).map((item) => item.property))).sort(),
    [experiments],
  );

  const filteredExperiments = useMemo(() => {
    if (!experiments) return [];

    const normalizedQuery = query.trim().toLocaleLowerCase('ru-RU');

    return experiments
      .filter((experiment) => {
        const searchValue =
          `${experiment.id} ${experiment.title} ${experiment.material} ` +
          `${experiment.equipment} ${experiment.sourceName}`;

        return (
          (!normalizedQuery ||
            searchValue
              .toLocaleLowerCase('ru-RU')
              .includes(normalizedQuery)) &&
          (material === 'all' || experiment.material === material) &&
          (property === 'all' || experiment.property === property)
        );
      })
      .sort((first, second) => Date.parse(second.date) - Date.parse(first.date));
  }, [experiments, material, property, query]);

  const resetFilters = () => {
    setQuery('');
    setMaterial('all');
    setProperty('all');
  };

  return (
    <WorkspaceLayout>
      <Box sx={{ px: { xs: 2, sm: 3, xl: 4 }, py: { xs: 3, md: 3.5 } }}>
        <Box sx={{ mb: 2.5 }}>
          <Typography variant="caption" color="text.secondary">
            База знаний / Экспериментальные данные
          </Typography>
          <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mt: 0.5 }}>
            <BiotechOutlinedIcon color="primary" />
            <Typography component="h1" variant="h4" fontWeight={800}>
              Экспериментальные данные
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Структурированные сведения, извлечённые из документов и каталога
            экспериментов
          </Typography>
        </Box>

        {experiments ? (
          <Stack spacing={2}>
            <ExperimentSummary experiments={experiments} />
            <ExperimentFilters
              query={query}
              material={material}
              property={property}
              materials={materials}
              properties={properties}
              onQueryChange={setQuery}
              onMaterialChange={setMaterial}
              onPropertyChange={setProperty}
              onReset={resetFilters}
            />
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'minmax(0, 1fr)',
                  lg: 'minmax(380px, 1fr) minmax(0, 1fr)',
                },
                gap: 2,
              }}
            >
              <ExperimentsList
                experiments={filteredExperiments}
                selectedId={selectedExperiment?.id ?? null}
                onSelect={(experiment) =>
                  navigate(`/experiments/${experiment.id}`)
                }
              />
              <ExperimentDetails
                experiment={selectedExperiment}
                onClose={() => navigate('/experiments')}
              />
            </Box>
          </Stack>
        ) : (
          <Stack spacing={2}>
            <Skeleton variant="rounded" height={90} />
            <Skeleton variant="rounded" height={64} />
            <Skeleton variant="rounded" height={560} />
          </Stack>
        )}
      </Box>
    </WorkspaceLayout>
  );
};
