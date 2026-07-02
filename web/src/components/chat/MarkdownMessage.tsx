import {
  Box,
  Divider,
  Link as MuiLink,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { ReactNode } from 'react';

interface MarkdownMessageProps {
  text: string;
}

const inlinePattern =
  /(\*\*[^*\n]+\*\*|`[^`\n]+`|\[[^\]\n]+\]\(https?:\/\/[^)\s]+\)|\*[^*\n]+\*)/g;

const renderInline = (text: string, keyPrefix: string): ReactNode[] => {
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
    if (value.startsWith('**')) {
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

export const MarkdownMessage = ({ text }: MarkdownMessageProps) => {
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
          {renderInline(heading[2], `heading-${index}`)}
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
                    {renderInline(cell, `table-head-${cellIndex}`)}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {headers.map((_, cellIndex) => (
                    <TableCell key={cellIndex}>
                      {renderInline(row[cellIndex] ?? '', `table-${rowIndex}-${cellIndex}`)}
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
              {renderInline(item, `list-${index}-${itemIndex}`)}
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
          {renderInline(quote.join(' '), `quote-${index}`)}
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
        {renderInline(paragraph.join(' '), `paragraph-${index}`)}
      </Typography>,
    );
  }

  return <Box sx={{ '& > :last-child': { mb: 0 } }}>{blocks}</Box>;
};
