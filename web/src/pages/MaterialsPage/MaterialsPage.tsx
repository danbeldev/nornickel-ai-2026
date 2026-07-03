import HexagonOutlinedIcon from '@mui/icons-material/HexagonOutlined';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import {
  Box,
  InputAdornment,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MaterialDetails } from '../../components/materials/MaterialDetails';
import { MaterialsList } from '../../components/materials/MaterialsList';
import { ListPagination } from '../../components/common/ListPagination';
import { WorkspaceLayout } from '../../components/layout/WorkspaceLayout';
import api from '../../data/api';
import {
  DocumentRecord,
  ExperimentRecord,
  MaterialRecord,
} from '../../data/types';

const PAGE_SIZE = 8;

export const MaterialsPage = () => {
  const { materialId } = useParams<{ materialId: string }>();
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<MaterialRecord[] | null>(null);
  const [experiments, setExperiments] = useState<ExperimentRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    Promise.all([
      api.getMaterials(),
      api.getExperiments(),
      api.getDocuments(),
    ]).then(([materialItems, experimentItems, documentItems]) => {
      setMaterials(materialItems);
      setExperiments(experimentItems);
      setDocuments(documentItems);
    });
  }, []);

  const selectedMaterial =
    materials?.find((material) => material.id === materialId) ?? null;

  const filteredMaterials = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ru-RU');

    return (materials ?? []).filter((material) =>
      `${material.name} ${material.category} ${material.aliases.join(' ')}`
        .toLocaleLowerCase('ru-RU')
        .includes(normalizedQuery),
    );
  }, [materials, query]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  useEffect(() => {
    if (!materialId) return;
    const selectedIndex = filteredMaterials.findIndex(
      (material) => material.id === materialId,
    );
    if (selectedIndex >= 0) {
      setPage(Math.floor(selectedIndex / PAGE_SIZE) + 1);
    }
  }, [filteredMaterials, materialId]);

  const paginatedMaterials = filteredMaterials.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  const relatedExperiments = selectedMaterial
    ? experiments.filter((experiment) =>
        selectedMaterial.experimentIds.includes(experiment.id),
      )
    : [];
  const relatedDocuments = selectedMaterial
    ? documents.filter((document) =>
        selectedMaterial.documentIds.includes(document.id),
      )
    : [];

  return (
    <WorkspaceLayout>
      <Box sx={{ px: { xs: 2, sm: 3, xl: 4 }, py: { xs: 3, md: 3.5 } }}>
        <Typography variant="caption" color="text.secondary">
          База знаний / Материалы
        </Typography>
        <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mt: 0.5 }}>
          <HexagonOutlinedIcon color="primary" />
          <Typography component="h1" variant="h4" fontWeight={800}>
            Материалы
          </Typography>
        </Stack>

        {materials ? (
          <>
            <TextField
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Найти материал или обозначение"
              size="small"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ width: { xs: '100%', md: 420 }, mt: 2.5 }}
            />
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'minmax(0, 1fr)',
                  lg: 'minmax(320px, .8fr) minmax(0, 1.2fr)',
                },
                gap: 2,
                mt: 2,
              }}
            >
              <Stack spacing={1}>
                <MaterialsList
                  materials={paginatedMaterials}
                  totalCount={filteredMaterials.length}
                  selectedId={materialId ?? null}
                  onSelect={(material) => navigate(`/materials/${material.id}`)}
                />
                <ListPagination
                  page={page}
                  pageSize={PAGE_SIZE}
                  totalItems={filteredMaterials.length}
                  onChange={setPage}
                />
              </Stack>
              <MaterialDetails
                material={selectedMaterial}
                experiments={relatedExperiments}
                documents={relatedDocuments}
              />
            </Box>
          </>
        ) : (
          <Stack spacing={2} sx={{ mt: 3 }}>
            <Skeleton variant="rounded" height={48} />
            <Skeleton variant="rounded" height={520} />
          </Stack>
        )}
      </Box>
    </WorkspaceLayout>
  );
};
