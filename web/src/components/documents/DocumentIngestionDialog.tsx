import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { ChangeEvent, useState } from 'react';
import api from '../../data/api';
import {
  DocumentRecord,
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
  const [result, setResult] = useState<UploadDocumentResponse | null>(null);
  const [processing, setProcessing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);

  const reset = () => {
    setFile(null);
    setResult(null);
    setProcessing(false);
    setPublishing(false);
    setPublished(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] ?? null);
  };

  const processDocument = async () => {
    if (!file) return;

    setProcessing(true);

    try {
      const response = await api.uploadDocument(file);
      setResult(response);
      onDocumentCreated(response.document);
    } finally {
      setProcessing(false);
    }
  };

  const publish = async () => {
    if (!result) return;

    setPublishing(true);

    try {
      await api.publishDocumentExtraction({
        documentId: result.document.id,
        entities: result.extraction.entities,
        relations: result.extraction.relations,
      });
      setPublished(true);
      onPublished(result.document.id);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="md">
      <DialogTitle>
        {result ? 'Результат обработки документа' : 'Добавить документ'}
      </DialogTitle>
      <DialogContent dividers>
        {!result ? (
          <Stack spacing={2.5}>
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
                PDF, DOCX, XLSX или CSV
              </Typography>
              <Button component="label" variant="outlined" sx={{ mt: 2 }}>
                Выбрать файл
                <input
                  hidden
                  type="file"
                  accept=".pdf,.docx,.xlsx,.csv"
                  onChange={selectFile}
                />
              </Button>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Система извлечёт сущности, динамические атрибуты и связи. Перед
              добавлением в граф вы увидите полный результат обработки.
            </Typography>
          </Stack>
        ) : published ? (
          <Alert severity="success" icon={<CheckCircleRoundedIcon />}>
            Извлечённые сущности и связи добавлены в граф знаний.
          </Alert>
        ) : (
          <ExtractionPreview extraction={result.extraction} />
        )}
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={close}>
          {published ? 'Закрыть' : 'Отмена'}
        </Button>
        {!result && (
          <Button
            variant="contained"
            disabled={!file || processing}
            onClick={processDocument}
            startIcon={
              processing ? <CircularProgress size={16} color="inherit" /> : null
            }
          >
            Обработать документ
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
