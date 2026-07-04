import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import HubOutlinedIcon from '@mui/icons-material/HubOutlined';
import LanguageRoundedIcon from '@mui/icons-material/LanguageRounded';
import {
  Box,
  Button,
  Divider,
  Chip,
  IconButton,
  Link as MuiLink,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Tooltip,
} from '@mui/material';
import { ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChatCitation } from '../../data/types';
import { getEntityPath } from '../../utils/entityRoutes';
import { getCitationPath } from '../../utils/citationRoutes';
import { knowledgeEntityConfig } from '../graph/graphConfig';
import api from '../../data/api';

interface MarkdownMessageProps {
  text: string;
  citations?: ChatCitation[];
  inlineSourcesEnabled?: boolean;
}

const inlinePattern =
  /(\[\[[\d,\s]+\]\](?:\s*[,;]?\s*\[\[[\d,\s]+\]\])*|\*\*[^*\n]+\*\*|`[^`\n]+`|\[[^\]\n]+\]\(https?:\/\/[^)\s]+\)|\*[^*\n]+\*)/g;

interface InlineCitationProps {
  value: string;
  citations: ChatCitation[];
  enabled: boolean;
}

const sourceCountLabel = (count: number) => {
  const lastTwo = count % 100;
  const last = count % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return `${count} источников`;
  if (last === 1) return `${count} источник`;
  if (last >= 2 && last <= 4) return `${count} источника`;
  return `${count} источников`;
};

const citationChipSx = {
  mx: 0.45,
  height: 22,
  maxWidth: 170,
  verticalAlign: 'middle',
  borderRadius: 0.8,
  backgroundColor: 'rgba(255,255,255,.07)',
  color: 'text.secondary',
  '& .MuiChip-label': {
    px: 0.8,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
} as const;

const InlineCitation = ({
  value,
  citations,
  enabled,
}: InlineCitationProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [entitiesExpanded, setEntitiesExpanded] = useState(false);
  if (!enabled) return null;
  const indexes = Array.from(
    new Set(
      Array.from(value.matchAll(/\d+/g))
        .map((match) => Number.parseInt(match[0], 10) - 1)
        .filter((index) => Number.isInteger(index) && citations[index]),
    ),
  );
  const sources = indexes.map((index) => citations[index]);
  if (sources.length === 0) return null;
  const primary = sources[0];
  const safeActiveIndex = Math.min(activeIndex, sources.length - 1);
  const activeSource = sources[safeActiveIndex];
  const activeSourceLabel = activeSource.label.replaceAll('_', ' ');
  const relatedEntities = activeSource.relatedEntities ?? [];
  const visibleRelatedEntities = entitiesExpanded
    ? relatedEntities
    : relatedEntities.slice(0, 3);
  const move = (direction: number) => {
    setActiveIndex(
      (current) => (current + direction + sources.length) % sources.length,
    );
  };
  const sourceCardContent = (
    <>
      {activeSource.visualId && activeSource.entityId && (
        <Box
          component="img"
          src={api.getDocumentVisualUrl(
            activeSource.entityId,
            activeSource.visualId,
          )}
          alt={activeSource.label}
          loading="lazy"
          sx={{
            display: 'block',
            width: 'calc(100% + 32px)',
            maxHeight: 210,
            ml: -2,
            mt: -2,
            mb: 1.5,
            objectFit: 'contain',
            backgroundColor: '#091119',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        />
      )}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.25 }}>
        <Box
          sx={{
            width: 30,
            height: 30,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            borderRadius: '50%',
            color: 'primary.main',
            backgroundColor: 'rgba(79,209,197,.12)',
          }}
        >
          {activeSource.url ? (
            <LanguageRoundedIcon sx={{ fontSize: 17 }} />
          ) : (
            <ArticleOutlinedIcon sx={{ fontSize: 17 }} />
          )}
        </Box>
        <Typography variant="body2" color="text.secondary" noWrap>
          {activeSourceLabel}
          {activeSource.page ? ` · стр. ${activeSource.page}` : ''}
          {activeSource.publishedAt
            ? ` · ${activeSource.publishedAt}`
            : ''}
        </Typography>
      </Stack>
      {!activeSource.url && (
        <Typography
          variant="caption"
          color="primary.main"
          fontWeight={800}
          sx={{ display: 'block', mb: 0.6 }}
        >
          ФРАГМЕНТ, ПОДТВЕРЖДАЮЩИЙ ОТВЕТ
        </Typography>
      )}
      <Typography
        variant="body2"
        fontWeight={600}
        lineHeight={1.65}
        sx={{ overflowWrap: 'anywhere' }}
      >
        «{activeSource.quote ?? activeSource.description}»
      </Typography>
      {!activeSource.url && (
        <Typography
          variant="caption"
          color="text.disabled"
          sx={{ display: 'block', mt: 1 }}
        >
          Нажмите, чтобы открыть документ
        </Typography>
      )}
      {activeSource.url && (
        <Typography
          variant="caption"
          color="text.disabled"
          sx={{
            display: 'block',
            mt: 1,
            overflowWrap: 'anywhere',
          }}
        >
          {activeSource.url}
        </Typography>
      )}
    </>
  );
  const sourceCardSx = {
    display: 'block',
    p: 2,
    color: 'text.primary',
    textDecoration: 'none',
    '&:hover': { backgroundColor: 'rgba(255,255,255,.035)' },
  } as const;

  return (
    <Tooltip
      arrow
      enterDelay={180}
      disableInteractive={false}
      slotProps={{
        tooltip: {
          sx: {
            p: 0,
            maxWidth: 390,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1.5,
            backgroundColor: '#171B20',
            boxShadow: '0 18px 48px rgba(0,0,0,.42)',
          },
        },
      }}
      title={
        <Box sx={{ width: { xs: 300, sm: 370 } }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ px: 1.25, py: 0.8, borderBottom: '1px solid', borderColor: 'divider' }}
          >
            <Stack direction="row" alignItems="center" spacing={0.25}>
              <IconButton
                size="small"
                disabled={sources.length <= 1}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  move(-1);
                }}
                sx={{ color: 'text.secondary' }}
              >
                <ChevronLeftRoundedIcon fontSize="small" />
              </IconButton>
              <Typography variant="body2" color="text.secondary">
                {safeActiveIndex + 1}/{sources.length}
              </Typography>
              <IconButton
                size="small"
                disabled={sources.length <= 1}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  move(1);
                }}
                sx={{ color: 'text.secondary' }}
              >
                <ChevronRightRoundedIcon fontSize="small" />
              </IconButton>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {sourceCountLabel(sources.length)}
            </Typography>
          </Stack>

          {activeSource.url ? (
            <Box
              component="a"
              href={activeSource.url}
              target="_blank"
              rel="noreferrer"
              sx={sourceCardSx}
            >
              {sourceCardContent}
            </Box>
          ) : activeSource.entityType && activeSource.entityId ? (
            <Box
              component={Link}
              to={
                getCitationPath(activeSource)
                ?? getEntityPath(
                  activeSource.entityType,
                  activeSource.entityId,
                )
              }
              sx={sourceCardSx}
            >
              {sourceCardContent}
            </Box>
          ) : (
            <Box sx={sourceCardSx}>{sourceCardContent}</Box>
          )}

          {relatedEntities.length > 0 && (
            <Box
              sx={{
                px: 1.25,
                py: 1.25,
                borderTop: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={800}
                sx={{ px: 0.75 }}
              >
                СУЩНОСТИ ИЗ ГРАФА
              </Typography>
              <Stack spacing={0.5} sx={{ mt: 0.75 }}>
                {visibleRelatedEntities.map((entity) => (
                  <Button
                    key={`${activeSource.id}-${entity.type}-${entity.id}`}
                    component={Link}
                    to={getEntityPath(entity.type, entity.id)}
                    color="inherit"
                    startIcon={<HubOutlinedIcon fontSize="small" />}
                    sx={{
                      justifyContent: 'flex-start',
                      px: 0.75,
                      py: 0.55,
                      textAlign: 'left',
                      borderRadius: 1,
                      '&:hover': {
                        backgroundColor: 'rgba(255,255,255,.05)',
                      },
                    }}
                  >
                    <Box minWidth={0} flex={1}>
                      <Typography variant="body2" fontWeight={700} noWrap>
                        {entity.label}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        noWrap
                        sx={{ display: 'block' }}
                      >
                        {knowledgeEntityConfig[entity.type].label}
                      </Typography>
                    </Box>
                  </Button>
                ))}
                {relatedEntities.length > 3 && (
                  <Button
                    size="small"
                    color="inherit"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setEntitiesExpanded((current) => !current);
                    }}
                    sx={{
                      alignSelf: 'flex-start',
                      color: 'text.secondary',
                    }}
                  >
                    {entitiesExpanded
                      ? 'Свернуть'
                      : `Ещё ${relatedEntities.length - 3}`}
                  </Button>
                )}
              </Stack>
            </Box>
          )}
        </Box>
      }
    >
      {primary.url ? (
        <Chip
          component="a"
          href={primary.url}
          target="_blank"
          rel="noreferrer"
          clickable
          size="small"
          label={`${primary.label.replaceAll('_', ' ')}${sources.length > 1 ? ` +${sources.length - 1}` : ''}`}
          sx={citationChipSx}
        />
      ) : primary.entityType && primary.entityId ? (
        <Chip
          component={Link}
          to={
            getCitationPath(primary)
              ?? getEntityPath(primary.entityType, primary.entityId)
          }
          clickable
          size="small"
          label={`${primary.label.replaceAll('_', ' ')}${sources.length > 1 ? ` +${sources.length - 1}` : ''}`}
          sx={citationChipSx}
        />
      ) : (
        <Chip
          size="small"
          label={`${primary.label.replaceAll('_', ' ')}${sources.length > 1 ? ` +${sources.length - 1}` : ''}`}
          sx={citationChipSx}
        />
      )}
    </Tooltip>
  );
};

const renderInline = (
  text: string,
  keyPrefix: string,
  citations: ChatCitation[],
  inlineSourcesEnabled: boolean,
): ReactNode[] => {
  const result: ReactNode[] = [];
  let cursor = 0;
  let token: RegExpExecArray | null;
  inlinePattern.lastIndex = 0;

  while ((token = inlinePattern.exec(text)) !== null) {
    if (token.index > cursor) {
      result.push(text.slice(cursor, token.index));
    }

    const value = token[0];
    const key = `${keyPrefix}-${token.index}`;
    if (value.startsWith('[[')) {
      result.push(
        <InlineCitation
          key={key}
          value={value}
          citations={citations}
          enabled={inlineSourcesEnabled}
        />,
      );
    } else if (value.startsWith('**')) {
      result.push(<strong key={key}>{value.slice(2, -2)}</strong>);
    } else if (value.startsWith('`')) {
      result.push(
        <Box
          key={key}
          component="code"
          sx={{
            px: 0.5,
            py: 0.15,
            borderRadius: 0.75,
            backgroundColor: 'rgba(255,255,255,.08)',
            fontFamily: 'monospace',
            fontSize: '0.9em',
          }}
        >
          {value.slice(1, -1)}
        </Box>,
      );
    } else if (value.startsWith('[')) {
      const link = value.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
      if (link) {
        result.push(
          <MuiLink
            key={key}
            href={link[2]}
            target="_blank"
            rel="noopener noreferrer"
          >
            {link[1]}
          </MuiLink>,
        );
      }
    } else {
      result.push(<em key={key}>{value.slice(1, -1)}</em>);
    }
    cursor = token.index + value.length;
  }

  if (cursor < text.length) {
    result.push(text.slice(cursor));
  }
  return result;
};

const splitTableRow = (line: string) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());

const isTableSeparator = (line: string) =>
  /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);

export const MarkdownMessage = ({
  text,
  citations = [],
  inlineSourcesEnabled = false,
}: MarkdownMessageProps) => {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = line.match(/^\s*```([\w-]*)\s*$/);
    if (fence) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !/^\s*```\s*$/.test(lines[index])) {
        code.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) {
        index += 1;
      }
      blocks.push(
        <Box
          key={`code-${index}`}
          component="pre"
          sx={{
            m: 0,
            my: 1.25,
            p: 1.5,
            overflowX: 'auto',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            backgroundColor: 'rgba(0,0,0,.24)',
            fontFamily: 'monospace',
            fontSize: '0.82rem',
            lineHeight: 1.6,
          }}
        >
          <code data-language={fence[1] || undefined}>{code.join('\n')}</code>
        </Box>,
      );
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      blocks.push(
        <Typography
          key={`heading-${index}`}
          component={`h${level + 2}` as 'h3' | 'h4' | 'h5'}
          variant={level === 1 ? 'h6' : level === 2 ? 'subtitle1' : 'subtitle2'}
          fontWeight={800}
          sx={{ mt: index === 0 ? 0 : 1.5, mb: 0.5 }}
        >
          {renderInline(heading[2], `heading-${index}`, citations, inlineSourcesEnabled)}
        </Typography>,
      );
      index += 1;
      continue;
    }

    if (index + 1 < lines.length && line.includes('|') && isTableSeparator(lines[index + 1])) {
      const headers = splitTableRow(line);
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }
      blocks.push(
        <TableContainer
          key={`table-${index}`}
          sx={{ my: 1.25, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                {headers.map((cell, cellIndex) => (
                  <TableCell key={cellIndex} sx={{ fontWeight: 800 }}>
                    {renderInline(cell, `table-head-${cellIndex}`, citations, inlineSourcesEnabled)}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {headers.map((_, cellIndex) => (
                    <TableCell key={cellIndex}>
                      {renderInline(row[cellIndex] ?? '', `table-${rowIndex}-${cellIndex}`, citations, inlineSourcesEnabled)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>,
      );
      continue;
    }

    const unordered = line.match(/^\s*[-+*]\s+(.+)$/);
    const ordered = line.match(/^\s*\d+\.\s+(.+)$/);
    if (unordered || ordered) {
      const items: string[] = [];
      const itemPattern = unordered ? /^\s*[-+*]\s+(.+)$/ : /^\s*\d+\.\s+(.+)$/;
      while (index < lines.length) {
        const item = lines[index].match(itemPattern);
        if (!item) {
          break;
        }
        items.push(item[1]);
        index += 1;
      }
      blocks.push(
        <Box
          key={`list-${index}`}
          component={unordered ? 'ul' : 'ol'}
          sx={{ my: 0.75, pl: 3 }}
        >
          {items.map((item, itemIndex) => (
            <Box component="li" key={itemIndex} sx={{ mb: 0.35 }}>
              {renderInline(item, `list-${index}-${itemIndex}`, citations, inlineSourcesEnabled)}
            </Box>
          ))}
        </Box>,
      );
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const quote: string[] = [];
      while (index < lines.length && /^\s*>\s?/.test(lines[index])) {
        quote.push(lines[index].replace(/^\s*>\s?/, ''));
        index += 1;
      }
      blocks.push(
        <Box
          key={`quote-${index}`}
          component="blockquote"
          sx={{
            my: 1,
            mx: 0,
            pl: 1.5,
            borderLeft: '3px solid',
            borderColor: 'primary.main',
            color: 'text.secondary',
          }}
        >
          {renderInline(quote.join(' '), `quote-${index}`, citations, inlineSourcesEnabled)}
        </Box>,
      );
      continue;
    }

    if (/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
      blocks.push(<Divider key={`divider-${index}`} sx={{ my: 1.5 }} />);
      index += 1;
      continue;
    }

    const paragraph: string[] = [line];
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^\s*```/.test(lines[index]) &&
      !/^(#{1,3})\s+/.test(lines[index]) &&
      !/^\s*[-+*]\s+/.test(lines[index]) &&
      !/^\s*\d+\.\s+/.test(lines[index]) &&
      !/^\s*>\s?/.test(lines[index]) &&
      !(index + 1 < lines.length && lines[index].includes('|') && isTableSeparator(lines[index + 1]))
    ) {
      paragraph.push(lines[index]);
      index += 1;
    }
    blocks.push(
      <Typography key={`paragraph-${index}`} variant="body2" lineHeight={1.75} sx={{ mb: 0.75 }}>
        {renderInline(paragraph.join(' '), `paragraph-${index}`, citations, inlineSourcesEnabled)}
      </Typography>,
    );
  }

  return <Box sx={{ '& > :last-child': { mb: 0 } }}>{blocks}</Box>;
};
