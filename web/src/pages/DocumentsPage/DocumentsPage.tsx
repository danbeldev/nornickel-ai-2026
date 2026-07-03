import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import {
  Box,
  Button,
  InputAdornment,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DocumentDetails } from '../../components/documents/DocumentDetails';
import { DocumentIngestionDialog } from '../../components/documents/DocumentIngestionDialog';
import { DocumentsList } from '../../components/documents/DocumentsList';
import { ListPagination } from '../../components/common/ListPagination';
import { WorkspaceLayout } from '../../components/layout/WorkspaceLayout';
import api from '../../data/api';
import {
  DocumentRecord,
  ExperimentRecord,
  IngestionJob,
  MaterialRecord,
} from '../../data/types';

const PAGE_SIZE = 8;

export const DocumentsPage = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentRecord[] | null>(null);
  const [experiments, setExperiments] = useState<ExperimentRecord[]>([]);
  const [materials, setMaterials] = useState<MaterialRecord[]>([]);
  const [query, setQuery] = useState('');
  const [ingestionOpen, setIngestionOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<IngestionJob | null>(null);
  const [jobLoading, setJobLoading] = useState(false);
  const [cancelingJob, setCancelingJob] = useState(false);
  const [jobError, setJobError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

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

  useEffect(() => {
    if (!documentId) {
      setSelectedJob(null);
      return;
    }

    let active = true;
    let timeout: number | undefined;
    setJobLoading(true);
    setSelectedJob(null);
    setJobError(null);

    const refresh = async () => {
      try {
        const jobs = await api.getDocumentJobs(documentId);
        if (!active) return;
        const latestJob = jobs[0] ?? null;
        setSelectedJob(latestJob);
        setJobLoading(false);

        if (latestJob && ['queued', 'running'].includes(latestJob.status)) {
          timeout = window.setTimeout(refresh, 1500);
          return;
        }

        const updatedDocument = await api.getDocument(documentId);
        if (!active || !updatedDocument) return;
        setDocuments((current) =>
          current?.map((item) =>
            item.id === documentId ? updatedDocument : item,
          ) ?? current,
        );
      } catch (exception) {
        if (!active) return;
        setJobLoading(false);
        setJobError((exception as Error).message);
        timeout = window.setTimeout(refresh, 3000);
      }
    };

    void refresh();

    return () => {
      active = false;
      if (timeout) window.clearTimeout(timeout);
    };
  }, [documentId]);

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

  useEffect(() => {
    setPage(1);
  }, [query]);

  useEffect(() => {
    if (!documentId) return;
    const selectedIndex = filteredDocuments.findIndex(
      (document) => document.id === documentId,
    );
    if (selectedIndex >= 0) {
      setPage(Math.floor(selectedIndex / PAGE_SIZE) + 1);
    }
  }, [documentId, filteredDocuments]);

  const paginatedDocuments = filteredDocuments.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  const relatedExperiments = selectedDocument
    ? experiments.filter((item) => selectedDocument.experimentIds.includes(item.id))
    : [];
  const relatedMaterials = selectedDocument
    ? materials.filter((item) => selectedDocument.materialIds.includes(item.id))
    : [];

  return (
    <WorkspaceLayout>
      <Box sx={{ px: { xs: 2, sm: 3, xl: 4 }, py: { xs: 3, md: 3.5 } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          spacing={2}
        >
          <Box>
            <Typography variant="caption" color="text.secondary">
              База знаний / Документы
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mt: 0.5 }}>
              <ArticleOutlinedIcon color="primary" />
              <Typography component="h1" variant="h4" fontWeight={800}>
                Документы
              </Typography>
            </Stack>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => setIngestionOpen(true)}
          >
            Добавить документ
          </Button>
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
              <Stack spacing={1}>
                <DocumentsList
                  documents={paginatedDocuments}
                  totalCount={filteredDocuments.length}
                  selectedId={documentId ?? null}
                  onSelect={(document) => navigate(`/documents/${document.id}`)}
                />
                <ListPagination
                  page={page}
                  pageSize={PAGE_SIZE}
                  totalItems={filteredDocuments.length}
                  onChange={setPage}
                />
              </Stack>
              <DocumentDetails
                document={selectedDocument}
                experiments={relatedExperiments}
                materials={relatedMaterials}
                job={selectedJob}
                jobLoading={jobLoading}
                canceling={cancelingJob}
                jobError={jobError}
                onCancel={async () => {
                  if (!selectedJob) return;
                  setCancelingJob(true);
                  setJobError(null);
                  try {
                    const canceled = await api.cancelIngestionJob(selectedJob.id);
                    setSelectedJob(canceled);
                    const updatedDocument = await api.getDocument(
                      selectedJob.documentId,
                    );
                    if (updatedDocument) {
                      setDocuments((current) =>
                        current?.map((item) =>
                          item.id === updatedDocument.id ? updatedDocument : item,
                        ) ?? current,
                      );
                    }
                  } catch (exception) {
                    setJobError((exception as Error).message);
                  } finally {
                    setCancelingJob(false);
                  }
                }}
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
      <DocumentIngestionDialog
        open={ingestionOpen}
        onClose={() => setIngestionOpen(false)}
        onDocumentCreated={(document) =>
          setDocuments((current) => {
            if (!current) return [document];
            if (current.some((item) => item.id === document.id)) {
              return current.map((item) =>
                item.id === document.id ? document : item,
              );
            }
            return [document, ...current];
          })
        }
        onPublished={async (publishedDocumentId) => {
          const [experimentItems, materialItems, publishedDocument] = await Promise.all([
            api.getExperiments(),
            api.getMaterials(),
            api.getDocument(publishedDocumentId),
          ]);
          setExperiments([...experimentItems]);
          setMaterials([...materialItems]);
          setDocuments((current) => {
            if (!current || !publishedDocument) return current;
            return current.map((item) =>
              item.id === publishedDocumentId ? publishedDocument : item,
            );
          });
          navigate(`/documents/${publishedDocumentId}`);
        }}
      />
    </WorkspaceLayout>
  );
};
