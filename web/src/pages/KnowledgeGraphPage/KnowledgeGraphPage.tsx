import DeviceHubRoundedIcon from '@mui/icons-material/DeviceHubRounded';
import { Box, Chip, Skeleton, Stack, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GraphFilters } from '../../components/graph/GraphFilters';
import { KnowledgeGraphCanvas } from '../../components/graph/KnowledgeGraphCanvas';
import { KnowledgeInspector } from '../../components/graph/KnowledgeInspector';
import { WorkspaceLayout } from '../../components/layout/WorkspaceLayout';
import api from '../../data/api';
import {
  KnowledgeEntityType,
  KnowledgeGraphData,
  KnowledgeGraphEntity,
} from '../../data/types';

const allEntityTypes = new Set<KnowledgeEntityType>([
  'material',
  'experiment',
  'property',
  'regime',
  'equipment',
  'document',
  'team',
  'conclusion',
  'unclassified',
]);

export const KnowledgeGraphPage = () => {
  const [searchParams] = useSearchParams();
  const focusEntityId = searchParams.get('focus');
  const [data, setData] = useState<KnowledgeGraphData | null>(null);
  const [query, setQuery] = useState('');
  const [activeTypes, setActiveTypes] =
    useState<Set<KnowledgeEntityType>>(allEntityTypes);
  const [selectedEntity, setSelectedEntity] =
    useState<KnowledgeGraphEntity | null>(null);

  useEffect(() => {
    api.getKnowledgeGraph().then(setData);
  }, []);

  useEffect(() => {
    if (!data || !focusEntityId) return;

    setSelectedEntity(
      data.entities.find((entity) => entity.id === focusEntityId) ?? null,
    );
  }, [data, focusEntityId]);

  const filteredEntities = useMemo(() => {
    if (!data) return [];

    const normalizedQuery = query.trim().toLocaleLowerCase('ru-RU');

    return data.entities.filter((entity) => {
      const matchesType = activeTypes.has(entity.type);
      const matchesQuery =
        !normalizedQuery ||
        `${entity.title} ${entity.subtitle}`
          .toLocaleLowerCase('ru-RU')
          .includes(normalizedQuery);

      return matchesType && matchesQuery;
    });
  }, [activeTypes, data, query]);

  const filteredConnections = useMemo(() => {
    if (!data) return [];

    const visibleIds = new Set(filteredEntities.map((entity) => entity.id));

    return data.connections.filter(
      (connection) =>
        visibleIds.has(connection.source) && visibleIds.has(connection.target),
    );
  }, [data, filteredEntities]);

  const handleToggleType = (type: KnowledgeEntityType) => {
    setActiveTypes((current) => {
      const next = new Set(current);

      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }

      return next;
    });
  };

  return (
    <WorkspaceLayout>
      <Box
        sx={{
          minHeight: 'calc(100vh - 72px)',
          display: 'flex',
          flexDirection: 'column',
          px: { xs: 2, sm: 3, xl: 4 },
          py: { xs: 3, md: 3.5 },
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          gap={2}
          sx={{ mb: 2.5 }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary">
              База знаний / Граф
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mt: 0.5 }}>
              <DeviceHubRoundedIcon color="primary" />
              <Typography component="h1" variant="h4" fontWeight={800}>
                Граф знаний
              </Typography>
            </Stack>
          </Box>
          {data && (
            <Stack direction="row" spacing={1}>
              <Chip
                size="small"
                label={`${data.entities.length} сущностей`}
                variant="outlined"
              />
              <Chip
                size="small"
                label={`${data.connections.length} связей`}
                variant="outlined"
              />
            </Stack>
          )}
        </Stack>

        {data ? (
          <>
            <GraphFilters
              entities={data.entities}
              query={query}
              activeTypes={activeTypes}
              onQueryChange={setQuery}
              onToggleType={handleToggleType}
            />

            <Box
              sx={{
                minHeight: 0,
                display: 'grid',
                flex: 1,
                gridTemplateColumns: {
                  xs: 'minmax(0, 1fr)',
                  lg: 'minmax(0, 1fr) 310px',
                },
                gap: 2,
                mt: 2,
              }}
            >
              <KnowledgeGraphCanvas
                entities={filteredEntities}
                connections={filteredConnections}
                onSelectEntity={setSelectedEntity}
                selectedEntityId={selectedEntity?.id ?? null}
              />
              <KnowledgeInspector
                entity={selectedEntity}
                totalEntities={filteredEntities.length}
                totalConnections={filteredConnections.length}
                onClose={() => setSelectedEntity(null)}
              />
            </Box>
          </>
        ) : (
          <Stack spacing={2} flex={1}>
            <Skeleton variant="rounded" height={64} />
            <Skeleton variant="rounded" sx={{ flex: 1, minHeight: 600 }} />
          </Stack>
        )}
      </Box>
    </WorkspaceLayout>
  );
};
