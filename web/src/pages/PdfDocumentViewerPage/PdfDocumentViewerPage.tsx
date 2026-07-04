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
import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { WorkspaceLayout } from '../../components/layout/WorkspaceLayout';
import api from '../../data/api';
import { DocumentRecord } from '../../data/types';

// The worker is copied to public before start/build. A stable same-origin URL
// avoids broken dynamically imported hashed assets behind the production proxy.
pdfjs.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL}/pdf.worker.min.mjs`;

const HIGHLIGHT_STOP_WORDS = new Set([
  'была',
  'были',
  'было',
  'для',
  'или',
  'как',
  'котор',
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

const normalizeSearchText = (value: string) =>
  value
    .toLocaleLowerCase('ru-RU')
    .replaceAll('ё', 'е')
    .replaceAll('²', '2')
    .replaceAll('³', '3')
    .replace(/[‐‑‒–—−]/g, '-')
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/\s+/g, ' ')
    .trim();

const searchTokens = (value: string) =>
  (
    normalizeSearchText(value).match(
      /[a-zа-я0-9]+(?:\.[0-9]+)?%?/g,
    ) ?? []
  ).map((token) =>
    !/\d/.test(token) && token.length >= 7
      ? token.slice(0, 5)
      : token,
  );

const quoteTerms = (quote: string) =>
  Array.from(
    new Set(
      searchTokens(quote).filter((term) => {
        const isNumber = /\d/.test(term);
        return (isNumber || term.length >= 4)
          && !HIGHLIGHT_STOP_WORDS.has(term);
      }),
    ),
  )
    .sort((left, right) => right.length - left.length)
    .slice(0, 24);

const quotePageScore = (quote: string, pageText: string) => {
  const terms = quoteTerms(quote);
  if (!terms.length) return 0;
  const pageTokens = new Set(searchTokens(pageText));
  const totalWeight = terms.reduce(
    (sum, term) => sum + (/\d/.test(term) ? 2.5 : 1),
    0,
  );
  const matchedWeight = terms.reduce(
    (sum, term) =>
      sum + (pageTokens.has(term) ? (/\d/.test(term) ? 2.5 : 1) : 0),
    0,
  );
  const normalizedQuote = normalizeSearchText(quote);
  const normalizedPage = normalizeSearchText(pageText);
  const exactBonus = normalizedPage.includes(normalizedQuote) ? 0.5 : 0;
  return matchedWeight / Math.max(totalWeight, 1) + exactBonus;
};

interface QuoteLocation {
  pageNumber: number;
  itemIndexes: number[];
  score: number;
}

const bestTextWindow = (
  quote: string,
  items: Array<{ index: number; text: string }>,
) => {
  let bestScore = -1;
  let bestIndexes: number[] = [];
  const quoteLength = Math.max(40, normalizeSearchText(quote).length);
  for (let start = 0; start < items.length; start += 1) {
    let candidate = '';
    for (
      let end = start;
      end < Math.min(items.length, start + 8);
      end += 1
    ) {
      candidate = `${candidate} ${items[end].text}`.trim();
      const lengthPenalty = Math.min(
        0.28,
        Math.max(0, candidate.length - quoteLength * 2.2)
          / (quoteLength * 8),
      );
      const score = quotePageScore(quote, candidate) - lengthPenalty;
      if (score > bestScore) {
        bestScore = score;
        bestIndexes = items
          .slice(start, end + 1)
          .map((item) => item.index);
      }
    }
  }
  return { score: bestScore, itemIndexes: bestIndexes };
};

const locateQuote = async (
  pdf: PDFDocumentProxy,
  quote: string,
  requestedPage: number,
): Promise<QuoteLocation> => {
  let bestPage = Math.min(Math.max(requestedPage, 1), pdf.numPages);
  let bestScore = -1;
  let bestItems: Array<{ index: number; text: string }> = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const items = content.items.flatMap((item, index) =>
      'str' in item && item.str.trim()
        ? [{ index, text: item.str }]
        : [],
    );
    const text = items.map((item) => item.text).join(' ');
    const score = quotePageScore(quote, text)
      + (pageNumber === requestedPage ? 0.015 : 0);
    if (score > bestScore) {
      bestScore = score;
      bestPage = pageNumber;
      bestItems = items;
    }
  }
  if (bestScore < 0.2) {
    return {
      pageNumber: requestedPage,
      itemIndexes: [],
      score: bestScore,
    };
  }
  const window = bestTextWindow(quote, bestItems);
  return {
    pageNumber: bestPage,
    itemIndexes: window.itemIndexes,
    score: window.score,
  };
};

export const PdfDocumentViewerPage = () => {
  const { documentId = '' } = useParams<{ documentId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedPage = Math.max(1, Number(searchParams.get('page')) || 1);
  const quote = searchParams.get('quote') ?? '';
  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [loadingDocument, setLoadingDocument] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState(requestedPage);
  const [pageCount, setPageCount] = useState(0);
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [locatingQuote, setLocatingQuote] = useState(false);
  const [locatedPage, setLocatedPage] = useState<number | null>(null);
  const [highlightItemIndexes, setHighlightItemIndexes] = useState<Set<number>>(
    new Set(),
  );
  const [quoteMatchScore, setQuoteMatchScore] = useState<number | null>(null);
  const locatedQuoteRef = useRef('');
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
    if (!pdfDocument || !quote) return;
    const locationKey = `${documentId}:${quote}`;
    if (locatedQuoteRef.current === locationKey) return;
    locatedQuoteRef.current = locationKey;
    let active = true;
    setLocatingQuote(true);
    locateQuote(pdfDocument, quote, requestedPage)
      .then((location) => {
        if (!active) return;
        setLocatedPage(location.pageNumber);
        setHighlightItemIndexes(new Set(location.itemIndexes));
        setQuoteMatchScore(location.score);
        setPageNumber(location.pageNumber);
        if (location.pageNumber !== requestedPage) {
          const nextParams = new URLSearchParams(searchParams);
          nextParams.set('page', String(location.pageNumber));
          setSearchParams(nextParams, { replace: true });
        }
      })
      .finally(() => {
        if (active) setLocatingQuote(false);
      });
    return () => {
      active = false;
    };
  }, [
    documentId,
    pdfDocument,
    quote,
    requestedPage,
    searchParams,
    setSearchParams,
  ]);

  useEffect(() => {
    const element = viewerRef.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      setViewerWidth(Math.max(320, Math.min(1000, entry.contentRect.width - 32)));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !quote || locatingQuote) return undefined;
    const scrollToMatch = () => {
      const match = viewer.querySelector<HTMLElement>(
        '.document-source-highlight',
      );
      if (!match) return false;
      match.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return true;
    };
    if (scrollToMatch()) return undefined;
    const observer = new MutationObserver(() => {
      if (scrollToMatch()) observer.disconnect();
    });
    observer.observe(viewer, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [locatingQuote, pageNumber, quote]);

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
              {locatingQuote
                ? 'Ищем точное место подтверждающего фрагмента в документе…'
                : quoteMatchScore !== null && quoteMatchScore >= 0.2
                  ? 'Подсвечен цельный фрагмент первоисточника, на основании '
                    + 'которого сформулирован вывод. Текст ответа может быть '
                    + 'пересказом, а не дословной цитатой.'
                  : 'Не удалось надёжно сопоставить цитату с текстовым слоем PDF. '
                    + 'Открыта страница, указанная источником.'}
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
                onLoadSuccess={(loadedPdf: PDFDocumentProxy) => {
                  setPdfDocument(loadedPdf);
                  setPageCount(loadedPdf.numPages);
                  setPageNumber(Math.min(requestedPage, loadedPdf.numPages));
                }}
                onLoadError={(error) => setLoadError(error.message)}
              >
                <Page
                  pageNumber={pageNumber}
                  width={viewerWidth}
                  renderAnnotationLayer
                  renderTextLayer
                  customTextRenderer={({ str, itemIndex }) =>
                    pageNumber === locatedPage
                    && highlightItemIndexes.has(itemIndex)
                      ? `<mark class="document-source-highlight">${escapeHtml(str)}</mark>`
                      : escapeHtml(str)
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
