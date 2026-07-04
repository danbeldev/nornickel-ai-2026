import BiotechOutlinedIcon from '@mui/icons-material/BiotechOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import HexagonOutlinedIcon from '@mui/icons-material/HexagonOutlined';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { Link } from 'react-router-dom';
import api from '../../data/api';
import {
  DocumentRecord,
  ExperimentRecord,
  IngestionJob,
  MaterialRecord,
} from '../../data/types';
import { documentStatusConfig } from './documentConfig';
import { TokenUsageSummary } from '../common/TokenUsageSummary';

interface DocumentDetailsProps {
  document: DocumentRecord | null;
  experiments: ExperimentRecord[];
  materials: MaterialRecord[];
  job: IngestionJob | null;
  jobLoading: boolean;
  canceling: boolean;
  jobError: string | null;
  onCancel: () => void;
}

export const DocumentDetails = ({
  document,
  experiments,
  materials,
  job,
  jobLoading,
  canceling,
  jobError,
  onCancel,
}: DocumentDetailsProps) => {
  if (!document) {
    return (
      <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
        <DescriptionOutlinedIcon color="primary" />
        <Typography fontWeight={800} sx={{ mt: 2 }}>
          Карточка документа
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Выберите документ, чтобы увидеть извлечённые сущности и связи.
        </Typography>
      </Paper>
    );
  }

  const status = documentStatusConfig[document.status];

  return (
    <Paper sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden' }}>
      <Box sx={{ p: 2.5 }}>
        <Stack direction="row" useFlexGap flexWrap="wrap" gap={0.75} sx={{ mb: 1.5 }}>
          <Chip label={document.type.toUpperCase()} size="small" variant="outlined" />
          <Chip label={status.label} size="small" color={status.color} variant="outlined" />
        </Stack>
        <Typography variant="h6" fontWeight={800}>
          {document.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {document.author} · {document.year}
        </Typography>
        {document.publishedAt && (
          <Typography variant="caption" color="text.secondary">
            Опубликовано:{' '}
            {new Intl.DateTimeFormat('ru-RU', {
              dateStyle: 'long',
            }).format(new Date(document.publishedAt))}
          </Typography>
        )}
        <Typography variant="body2" lineHeight={1.7} sx={{ mt: 2 }}>
          {document.description}
        </Typography>
        <Stack direction="row" useFlexGap flexWrap="wrap" gap={1} sx={{ mt: 2 }}>
        {document.sourceUrl && (
          <Button
            component="a"
            href={document.sourceUrl}
            target="_blank"
            rel="noreferrer"
            variant="outlined"
            startIcon={<OpenInNewRoundedIcon />}
          >
            Открыть источник
          </Button>
        )}
        {document.downloadAvailable && (
          <Button
            component="a"
            href={api.getDocumentDownloadUrl(document.id)}
            variant="outlined"
            startIcon={<DownloadRoundedIcon />}
          >
            Скачать оригинал
          </Button>
        )}
        </Stack>
      </Box>

      {(document.status === 'processing' || job) && (
        <>
          <Divider />
          <Box sx={{ p: 2.5 }}>
            {jobError && (
              <Alert severity="error" sx={{ mb: 1.5 }}>
                {jobError}
              </Alert>
            )}
            <Stack direction="row" justifyContent="space-between" spacing={2}>
              <Box>
                <Typography fontWeight={800}>
                  {job?.type === 'document_publish'
                    ? 'Публикация в графе знаний'
                    : 'Обработка документа'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {job?.stage
                    ?? (jobLoading
                      ? 'Получение состояния фоновой задачи…'
                      : 'Задача ожидает запуска')}
                </Typography>
              </Box>
              <Typography variant="body2" fontWeight={800}>
                {job?.progress ?? 0}%
              </Typography>
            </Stack>
            <LinearProgress
              variant={job ? 'determinate' : 'indeterminate'}
              value={job?.progress ?? 0}
              color={
                job?.status === 'canceled'
                  ? 'warning'
                  : job?.status === 'failed'
                    ? 'error'
                    : 'primary'
              }
              sx={{ mt: 1.5 }}
            />
            {job && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Обновлено: {new Date(job.updatedAt).toLocaleTimeString('ru-RU')}
              </Typography>
            )}
            {job && ['queued', 'running'].includes(job.status) && job.type === 'document_processing' && (
              <Button
                color="error"
                variant="outlined"
                size="small"
                startIcon={<CancelOutlinedIcon />}
                disabled={canceling}
                onClick={onCancel}
                sx={{ mt: 1.5 }}
              >
                {canceling ? 'Отмена…' : 'Отменить обработку'}
              </Button>
            )}
          </Box>
        </>
      )}

      <Divider />

      <Box sx={{ p: 2.5 }}>
        <Stack spacing={1.25}>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">Страницы</Typography>
            <Typography variant="body2" fontWeight={700}>{document.pages ?? '—'}</Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">Извлечено сущностей</Typography>
            <Typography variant="body2" fontWeight={700}>{document.extractedEntities}</Typography>
          </Stack>
          {!!document.tokenUsage?.length && (
            <>
              <Typography variant="body2" color="text.secondary">
                Токены обработки
              </Typography>
              <TokenUsageSummary usages={document.tokenUsage} />
            </>
          )}
        </Stack>
      </Box>

      <Divider />

      <Box sx={{ p: 2.5 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={800}>
          МАТЕРИАЛЫ
        </Typography>
        <Stack spacing={0.5} sx={{ mt: 1 }}>
          {materials.map((material) => (
            <Button
              key={material.id}
              component={Link}
              to={`/materials/${material.id}`}
              color="inherit"
              startIcon={<HexagonOutlinedIcon />}
              sx={{ justifyContent: 'flex-start', color: 'text.secondary' }}
            >
              {material.name}
            </Button>
          ))}
        </Stack>
      </Box>

      <Divider />

      <Box sx={{ p: 2.5 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={800}>
          ЭКСПЕРИМЕНТЫ
        </Typography>
        <Stack spacing={0.5} sx={{ mt: 1 }}>
          {experiments.map((experiment) => (
            <Button
              key={experiment.id}
              component={Link}
              to={`/experiments/${experiment.id}`}
              color="inherit"
              startIcon={<BiotechOutlinedIcon />}
              sx={{ justifyContent: 'flex-start', color: 'text.secondary' }}
            >
              {experiment.id} · {experiment.property}
            </Button>
          ))}
        </Stack>
      </Box>
    </Paper>
  );
};
