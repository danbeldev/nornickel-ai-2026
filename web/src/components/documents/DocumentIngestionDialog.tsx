import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { ChangeEvent, useEffect, useRef, useState } from 'react';
import api from '../../data/api';
import {
  DocumentRecord,
  IngestionJob,
  UploadDocumentResponse,
} from '../../data/types';
import { ExtractionPreview } from './ExtractionPreview';

interface DocumentIngestionDialogProps {
  open: boolean;
  onClose: () => void;
  onDocumentCreated: (document: DocumentRecord) => void;
  onPublished: (documentId: string) => void;
}

export const DocumentIngestionDialog = ({
  open,
  onClose,
  onDocumentCreated,
  onPublished,
}: DocumentIngestionDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [sourceMode, setSourceMode] = useState<'file' | 'url'>('file');
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<UploadDocumentResponse | null>(null);
  const [processing, setProcessing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [copied, setCopied] = useState(false);
  const [issuesCopied, setIssuesCopied] = useState(false);
  const [job, setJob] = useState<IngestionJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const operationRef = useRef<AbortController | null>(null);

  useEffect(() => () => operationRef.current?.abort(), []);

  const reset = () => {
    setFile(null);
    setSourceMode('file');
    setUrl('');
    setResult(null);
    setProcessing(false);
    setPublishing(false);
    setPublished(false);
    setCopied(false);
    setIssuesCopied(false);
    setJob(null);
    setError(null);
    operationRef.current?.abort();
    operationRef.current = null;
  };

  const close = () => {
    reset();
    onClose();
  };

  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] ?? null);
  };

  const processDocument = async () => {
    if (sourceMode === 'file' && !file) return;
    if (sourceMode === 'url' && !url.trim()) return;

    setProcessing(true);
    setJob(null);
    setError(null);
    const operation = new AbortController();
    operationRef.current = operation;

    try {
      const queued =
        sourceMode === 'file'
          ? await api.uploadDocument(file as File)
          : await api.importDocumentUrl(url.trim());
      onDocumentCreated(queued.document);
      await api.waitForIngestionJob(
        queued.jobId,
        ['ready_for_review'],
        operation.signal,
        setJob,
      );
      const [document, extraction] = await Promise.all([
        api.getDocument(queued.document.id),
        api.getDocumentExtraction(queued.document.id),
      ]);
      const response = {
        document: document ?? queued.document,
        extraction,
        jobId: queued.jobId,
      };
      setResult(response);
      onDocumentCreated(response.document);
    } catch (exception) {
      if ((exception as Error).name !== 'AbortError') {
        setError((exception as Error).message);
      }
    } finally {
      setProcessing(false);
      if (operationRef.current === operation) {
        operationRef.current = null;
      }
    }
  };

  const publish = async () => {
    if (!result) return;

    setPublishing(true);
    setJob(null);
    setError(null);
    const operation = new AbortController();
    operationRef.current = operation;

    try {
      const response = await api.publishDocumentExtraction({
        documentId: result.document.id,
        entities: result.extraction.entities,
        relations: result.extraction.relations,
      });
      await api.waitForIngestionJob(
        response.jobId,
        ['published'],
        operation.signal,
        setJob,
      );
      setPublished(true);
      onPublished(result.document.id);
    } catch (exception) {
      if ((exception as Error).name !== 'AbortError') {
        setError((exception as Error).message);
      }
    } finally {
      setPublishing(false);
      if (operationRef.current === operation) {
        operationRef.current = null;
      }
    }
  };

  const cancelProcessing = async () => {
    if (!job || job.status === 'canceled') return;
    try {
      const canceledJob = await api.cancelIngestionJob(job.id);
      operationRef.current?.abort();
      setJob(canceledJob);
      setProcessing(false);
    } catch (exception) {
      setError((exception as Error).message);
    }
  };

  const copyExtractionResult = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(result.extraction, null, 2),
      );
      setCopied(true);
    } catch {
      setError('Не удалось скопировать JSON результата обработки.');
    }
  };

  const copyDataIssues = async () => {
    if (!result) return;
    const dataIssues = result.extraction.entities.filter(
      (entity) => entity.type === 'data_issue',
    );
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(
          {
            documentId: result.extraction.documentId,
            dataIssues,
          },
          null,
          2,
        ),
      );
      setIssuesCopied(true);
    } catch {
      setError('Не удалось скопировать проблемы в данных.');
    }
  };

  const dataIssueCount =
    result?.extraction.entities.filter(
      (entity) => entity.type === 'data_issue',
    ).length ?? 0;

  return (
    <Dialog
      open={open}
      onClose={close}
      fullWidth
      maxWidth={result ? 'lg' : 'md'}
    >
      <DialogTitle>
        {result ? 'Результат обработки документа' : 'Добавить документ'}
      </DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {job?.status === 'canceled' && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Обработка документа отменена. Можно закрыть окно или запустить загрузку заново.
          </Alert>
        )}
        {(processing || publishing) && (
          <Box sx={{ mb: 2 }}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
              <Typography variant="body2" color="text.secondary">
                {publishing
                  ? 'Публикация в графе знаний'
                  : job?.stage ?? 'Подготовка фоновой обработки'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {job?.progress ?? 0}%
              </Typography>
            </Stack>
            <LinearProgress
              variant={job ? 'determinate' : 'indeterminate'}
              value={job?.progress ?? 0}
            />
          </Box>
        )}
        {!result ? (
          <Stack spacing={2.5}>
            <Tabs
              value={sourceMode}
              onChange={(_, value: 'file' | 'url') => setSourceMode(value)}
              aria-label="Способ добавления документа"
            >
              <Tab value="file" label="Загрузить файл" />
              <Tab value="url" label="Указать ссылку" />
            </Tabs>
            {sourceMode === 'file' ? (
              <Box
                sx={{
                  p: 4,
                  textAlign: 'center',
                  border: '1px dashed',
                  borderColor: file ? 'primary.main' : 'divider',
                  borderRadius: 1.5,
                  backgroundColor: 'rgba(255,255,255,.015)',
                }}
              >
                <CloudUploadOutlinedIcon
                  color={file ? 'primary' : 'disabled'}
                  sx={{ fontSize: 38 }}
                />
                <Typography fontWeight={800} sx={{ mt: 1.5 }}>
                  {file?.name ?? 'Выберите научный документ'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  PDF, DOCX, PPTX, XLSX или CSV
                </Typography>
                <Button component="label" variant="outlined" sx={{ mt: 2 }}>
                  Выбрать файл
                  <input
                    hidden
                    type="file"
                    accept=".pdf,.docx,.pptx,.xlsx,.csv"
                    onChange={selectFile}
                  />
                </Button>
              </Box>
            ) : (
              <Stack
                spacing={1.5}
                sx={{
                  p: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1.5,
                  backgroundColor: 'rgba(255,255,255,.015)',
                }}
              >
                <LinkRoundedIcon color="primary" sx={{ fontSize: 34 }} />
                <Typography fontWeight={800}>
                  Ссылка на статью или документ
                </Typography>
                <TextField
                  autoFocus
                  type="url"
                  label="URL"
                  placeholder="https://example.com/article"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  fullWidth
                />
                <Typography variant="body2" color="text.secondary">
                  Поддерживаются HTML-статьи и прямые ссылки на PDF, DOCX,
                  PPTX, XLSX или CSV.
                </Typography>
              </Stack>
            )}
            <Typography variant="body2" color="text.secondary">
              Система сохранит источник, извлечёт сущности, динамические
              атрибуты и связи. Перед добавлением в граф вы увидите полный
              результат обработки.
            </Typography>
          </Stack>
        ) : published ? (
          <Alert severity="success" icon={<CheckCircleRoundedIcon />}>
            Извлечённые сущности и связи добавлены в граф знаний.
          </Alert>
        ) : (
          <ExtractionPreview
            extraction={result.extraction}
            onChange={(extraction) =>
              setResult((current) =>
                current ? { ...current, extraction } : current,
              )
            }
          />
        )}
      </DialogContent>
      <DialogActions sx={{ flexWrap: 'wrap', gap: 0.5 }}>
        <Button
          color={processing && job ? 'error' : 'inherit'}
          onClick={processing && job ? cancelProcessing : close}
        >
          {processing && job
            ? 'Отменить обработку'
            : published
              ? 'Закрыть'
              : 'Отмена'}
        </Button>
        {result && (
          <Button
            color="inherit"
            startIcon={<ContentCopyRoundedIcon />}
            onClick={copyExtractionResult}
          >
            {copied ? 'Скопировано' : 'Скопировать'}
          </Button>
        )}
        {result && (
          <Button
            color="inherit"
            startIcon={<ContentCopyRoundedIcon />}
            onClick={copyDataIssues}
            disabled={dataIssueCount === 0}
          >
            {issuesCopied
              ? 'Проблемы скопированы'
              : `Скопировать проблемы (${dataIssueCount})`}
          </Button>
        )}
        {!result && (
          <Button
            variant="contained"
            disabled={
              processing ||
              (sourceMode === 'file' ? !file : !url.trim())
            }
            onClick={processDocument}
            startIcon={
              processing ? <CircularProgress size={16} color="inherit" /> : null
            }
          >
            {sourceMode === 'file' ? 'Обработать документ' : 'Загрузить по ссылке'}
          </Button>
        )}
        {result && !published && (
          <Button
            variant="contained"
            disabled={publishing}
            onClick={publish}
            startIcon={
              publishing ? <CircularProgress size={16} color="inherit" /> : null
            }
          >
            Добавить в граф
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
