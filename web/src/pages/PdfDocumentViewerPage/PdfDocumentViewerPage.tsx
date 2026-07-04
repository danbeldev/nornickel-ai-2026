import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { WorkspaceLayout } from '../../components/layout/WorkspaceLayout';
import api from '../../data/api';
import { DocumentRecord } from '../../data/types';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const HIGHLIGHT_STOP_WORDS = new Set([
  'была',
  'были',
  'было',
  'для',
  'или',
  'как',
  'который',
  'после',
  'при',
  'также',
  'что',
  'этого',
  'with',
  'from',
  'that',
  'this',
]);

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const quoteTerms = (quote: string) =>
  Array.from(
    new Set(
      quote
        .toLocaleLowerCase('ru-RU')
        .match(/[A-Za-zА-Яа-яЁё0-9°%.-]+/g)
        ?.filter(
          (term) =>
            term.length >= 4 && !HIGHLIGHT_STOP_WORDS.has(term),
        ) ?? [],
    ),
  )
    .sort((left, right) => right.length - left.length)
    .slice(0, 16);

const highlightTextItem = (text: string, terms: string[]) => {
  if (!terms.length) return escapeHtml(text);
  const pattern = new RegExp(
    `(${terms.map(escapeRegExp).join('|')})`,
    'giu',
  );
  return escapeHtml(text).replace(
    pattern,
    '<mark class="document-source-highlight">$1</mark>',
  );
};

export const PdfDocumentViewerPage = () => {
  const { documentId = '' } = useParams<{ documentId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedPage = Math.max(1, Number(searchParams.get('page')) || 1);
  const quote = searchParams.get('quote') ?? '';
  const terms = useMemo(() => quoteTerms(quote), [quote]);
  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [loadingDocument, setLoadingDocument] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState(requestedPage);
  const [pageCount, setPageCount] = useState(0);
  const [viewerWidth, setViewerWidth] = useState(900);
  const viewerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLoadingDocument(true);
    api.getDocument(documentId).then((result) => {
      setDocument(result);
      setLoadingDocument(false);
    });
  }, [documentId]);

  useEffect(() => {
    setPageNumber(requestedPage);
  }, [requestedPage]);

  useEffect(() => {
    const element = viewerRef.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      setViewerWidth(Math.max(320, Math.min(1000, entry.contentRect.width - 32)));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const changePage = (nextPage: number) => {
    if (!Number.isFinite(nextPage)) return;
    const safePage = Math.max(
      1,
      Math.min(pageCount || 1, Math.round(nextPage)),
    );
    setPageNumber(safePage);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('page', String(safePage));
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <WorkspaceLayout>
      <Box sx={{ px: 2, py: 2.5, height: 'calc(100vh - 72px)' }}>
        <Stack sx={{ height: '100%' }} spacing={1.5}>
          <Paper
            sx={{
              p: 1.25,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
            }}
          >
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              alignItems={{ md: 'center' }}
              justifyContent="space-between"
              gap={1}
            >
              <Stack direction="row" alignItems="center" spacing={1}>
                <IconButton
                  component={Link}
                  to={`/documents/${encodeURIComponent(documentId)}`}
                  aria-label="Вернуться к документу"
                >
                  <ArrowBackRoundedIcon />
                </IconButton>
                <Box>
                  <Typography fontWeight={800}>
                    {document?.title ?? 'Просмотр документа'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {quote
                      ? 'Открыт фрагмент, подтверждающий ответ'
                      : 'Оригинальный PDF-документ'}
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" alignItems="center" spacing={0.75}>
                <IconButton
                  disabled={pageNumber <= 1}
                  onClick={() => changePage(pageNumber - 1)}
                  aria-label="Предыдущая страница"
                >
                  <ChevronLeftRoundedIcon />
                </IconButton>
                <TextField
                  size="small"
                  value={pageNumber}
                  onChange={(event) => changePage(Number(event.target.value))}
                  inputProps={{ min: 1, max: pageCount, type: 'number' }}
                  sx={{ width: 74 }}
                />
                <Typography variant="body2" color="text.secondary">
                  из {pageCount || '—'}
                </Typography>
                <IconButton
                  disabled={!pageCount || pageNumber >= pageCount}
                  onClick={() => changePage(pageNumber + 1)}
                  aria-label="Следующая страница"
                >
                  <ChevronRightRoundedIcon />
                </IconButton>
                <Button
                  component="a"
                  href={api.getDocumentDownloadUrl(documentId)}
                  startIcon={<DownloadRoundedIcon />}
                  variant="outlined"
                >
                  Скачать
                </Button>
              </Stack>
            </Stack>
          </Paper>

          {quote && (
            <Alert severity="info">
              Подсвечены ключевые слова из подтверждающего фрагмента: «{quote}»
            </Alert>
          )}

          <Paper
            ref={viewerRef}
            sx={{
              flex: 1,
              minHeight: 0,
              overflow: 'auto',
              display: 'flex',
              justifyContent: 'center',
              p: 2,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              backgroundColor: '#071018',
              '& .react-pdf__Page': {
                boxShadow: '0 12px 40px rgba(0,0,0,.35)',
              },
              '& .document-source-highlight': {
                color: 'inherit',
                backgroundColor: 'rgba(255, 193, 7, .72)',
                borderRadius: '2px',
                boxShadow: '0 0 0 1px rgba(255, 193, 7, .45)',
              },
            }}
          >
            {loadingDocument ? (
              <CircularProgress sx={{ alignSelf: 'center' }} />
            ) : !document ? (
              <Alert severity="error">Документ не найден.</Alert>
            ) : document.type !== 'pdf' ? (
              <Alert severity="warning">
                Точный просмотр источника пока поддерживается только для PDF.
              </Alert>
            ) : (
              <Document
                file={api.getDocumentDownloadUrl(documentId)}
                loading={<CircularProgress sx={{ mt: 4 }} />}
                error={
                  <Alert severity="error">
                    {loadError ?? 'Не удалось открыть PDF-документ.'}
                  </Alert>
                }
                onLoadSuccess={({ numPages }) => {
                  setPageCount(numPages);
                  setPageNumber(Math.min(requestedPage, numPages));
                }}
                onLoadError={(error) => setLoadError(error.message)}
              >
                <Page
                  pageNumber={pageNumber}
                  width={viewerWidth}
                  renderAnnotationLayer
                  renderTextLayer
                  customTextRenderer={({ str }) =>
                    highlightTextItem(str, terms)
                  }
                />
              </Document>
            )}
          </Paper>
        </Stack>
      </Box>
    </WorkspaceLayout>
  );
};
