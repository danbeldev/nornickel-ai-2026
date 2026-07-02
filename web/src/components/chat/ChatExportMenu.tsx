import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import {
  Button,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
} from '@mui/material';
import { MouseEvent, useState } from 'react';
import { ChatMessage } from '../../data/types';

interface Props {
  message: ChatMessage;
}

const download = (filename: string, content: string, type: string) => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const markdown = (message: ChatMessage) => {
  const sources = (message.citations ?? [])
    .map(
      (source, index) =>
        `${index + 1}. ${source.label}${
          source.page ? `, стр. ${source.page}` : ''
        } — ${source.description}`,
    )
    .join('\n');
  return `${message.text}\n\n## Источники\n\n${sources || 'Источники не найдены.'}\n`;
};

const jsonLd = (message: ChatMessage) =>
  JSON.stringify(
    {
      '@context': {
        name: 'https://schema.org/name',
        description: 'https://schema.org/description',
        source: 'https://schema.org/citation',
        relationship: 'https://schema.org/relatedTo',
      },
      '@type': 'ResearchAnswer',
      text: message.text,
      source: message.citations ?? [],
      '@graph': [
        ...(message.evidence?.entities ?? []).map((entity) => ({
          '@id': entity.id,
          '@type': entity.type,
          name: entity.label,
          description: entity.description,
        })),
        ...(message.evidence?.paths ?? []).map((path) => ({
          '@id': `${path.sourceId}-${path.relationship}-${path.targetId}`,
          '@type': 'Relationship',
          source: path.sourceId,
          relationship: path.relationship,
          target: path.targetId,
        })),
      ],
    },
    null,
    2,
  );

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

export const ChatExportMenu = ({ message }: Props) => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = () => setAnchor(null);

  const printPdf = () => {
    const popup = window.open('', '_blank');
    if (!popup) return;
    const sources = (message.citations ?? [])
      .map(
        (source, index) =>
          `<li>${index + 1}. ${escapeHtml(source.label)}${
            source.page ? `, стр. ${source.page}` : ''
          }</li>`,
      )
      .join('');
    popup.document.write(`<!doctype html>
      <html lang="ru"><head><meta charset="utf-8"><title>Исследовательский ответ</title>
      <style>body{font:16px/1.6 Arial,sans-serif;max-width:900px;margin:40px auto;color:#182028}
      pre{white-space:pre-wrap;font:inherit}h1{font-size:24px}</style></head>
      <body><h1>Исследовательский ответ</h1><pre>${escapeHtml(message.text)}</pre>
      <h2>Источники</h2><ol>${sources}</ol></body></html>`);
    popup.document.close();
    popup.focus();
    popup.print();
    close();
  };

  return (
    <>
      <Button
        size="small"
        color="inherit"
        startIcon={<DownloadRoundedIcon />}
        onClick={(event: MouseEvent<HTMLButtonElement>) =>
          setAnchor(event.currentTarget)
        }
      >
        Экспорт
      </Button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
        <MenuItem
          onClick={() => {
            download(`answer-${message.id}.md`, markdown(message), 'text/markdown');
            close();
          }}
        >
          <ListItemIcon><DownloadRoundedIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Markdown</ListItemText>
        </MenuItem>
        <MenuItem onClick={printPdf}>
          <ListItemIcon><DownloadRoundedIcon fontSize="small" /></ListItemIcon>
          <ListItemText>PDF через печать</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            download(
              `answer-${message.id}.jsonld`,
              jsonLd(message),
              'application/ld+json',
            );
            close();
          }}
        >
          <ListItemIcon><DownloadRoundedIcon fontSize="small" /></ListItemIcon>
          <ListItemText>JSON-LD</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};
