import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
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
import { DocumentDetails } from '../../components/documents/DocumentDetails';
import { DocumentsList } from '../../components/documents/DocumentsList';
import { WorkspaceLayout } from '../../components/layout/WorkspaceLayout';
import api from '../../data/api';
import {
  DocumentRecord,
  ExperimentRecord,
  MaterialRecord,
} from '../../data/types';

export const DocumentsPage = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentRecord[] | null>(null);
  const [experiments, setExperiments] = useState<ExperimentRecord[]>([]);
  const [materials, setMaterials] = useState<MaterialRecord[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    Promise.all([
      api.getDocuments(),
      api.getExperiments(),
      api.getMaterials(),
    ]).then(([documentItems, experimentItems, materialItems]) => {
      setDocuments(documentItems);
      setExperiments(experimentItems);
      setMaterials(materialItems);
    });
  }, []);

  const selectedDocument =
    documents?.find((document) => document.id === documentId) ?? null;
  const filteredDocuments = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ru-RU');

    return (documents ?? []).filter((document) =>
      `${document.title} ${document.author} ${document.description}`
        .toLocaleLowerCase('ru-RU')
        .includes(normalizedQuery),
    );
  }, [documents, query]);

  const relatedExperiments = selectedDocument
    ? experiments.filter((item) => selectedDocument.experimentIds.includes(item.id))
    : [];
  const relatedMaterials = selectedDocument
    ? materials.filter((item) => selectedDocument.materialIds.includes(item.id))
    : [];

  return (
    <WorkspaceLayout>
      <Box sx={{ px: { xs: 2, sm: 3, xl: 4 }, py: { xs: 3, md: 3.5 } }}>
        <Typography variant="caption" color="text.secondary">
          База знаний / Документы
        </Typography>
        <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mt: 0.5 }}>
          <ArticleOutlinedIcon color="primary" />
          <Typography component="h1" variant="h4" fontWeight={800}>
            Документы
          </Typography>
        </Stack>

        {documents ? (
          <>
            <TextField
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Найти документ, автора или тему"
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
                  lg: 'minmax(380px, 1fr) minmax(0, 1fr)',
                },
                gap: 2,
                mt: 2,
              }}
            >
              <DocumentsList
                documents={filteredDocuments}
                selectedId={documentId ?? null}
                onSelect={(document) => navigate(`/documents/${document.id}`)}
              />
              <DocumentDetails
                document={selectedDocument}
                experiments={relatedExperiments}
                materials={relatedMaterials}
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
