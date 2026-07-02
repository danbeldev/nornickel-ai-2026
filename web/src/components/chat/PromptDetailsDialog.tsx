import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
} from '@mui/material';
import { useState } from 'react';
import { ChatEvidence } from '../../data/types';

interface PromptDetailsDialogProps {
  open: boolean;
  evidence: ChatEvidence;
  onClose: () => void;
}

const transformationLabels: Record<
  NonNullable<ChatEvidence['transformation']>,
  string
> = {
  none: 'не выполнялось',
  compression: 'сжатие follow-up',
  rewrite: 'переформулирование',
  compression_rejected: 'сжатие отклонено',
  rewrite_rejected: 'переформулирование отклонено',
};

export const PromptDetailsDialog = ({
  open,
  evidence,
  onClose,
}: PromptDetailsDialogProps) => {
  const [copied, setCopied] = useState(false);
  const prompt = `[SYSTEM]\n${evidence.systemPrompt}\n\n[USER]\n${evidence.userPrompt}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Почему такой ответ?</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          Показан финальный prompt без истории предыдущих сообщений чата.
        </Alert>
        {(evidence.retrievalQuery || evidence.graphDepth) && (
          <Box sx={{ mb: 2 }}>
            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
              {evidence.transformation && (
                <Chip
                  size="small"
                  label={`Преобразование: ${
                    transformationLabels[evidence.transformation]
                  }`}
                />
              )}
              {evidence.graphDepth && (
                <Chip
                  size="small"
                  label={`Глубина графа: ${evidence.graphDepth}`}
                />
              )}
            </Stack>
            {evidence.retrievalQuery && (
              <Alert severity="success" sx={{ mt: 1 }}>
                Запрос к GraphRAG: {evidence.retrievalQuery}
              </Alert>
            )}
          </Box>
        )}
        <Box
          component="pre"
          sx={{
            m: 0,
            p: 2,
            maxHeight: '62vh',
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            backgroundColor: 'rgba(0,0,0,.2)',
            fontFamily: 'monospace',
            fontSize: '0.78rem',
            lineHeight: 1.6,
          }}
        >
          {prompt}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          color="inherit"
          startIcon={<ContentCopyRoundedIcon />}
          onClick={handleCopy}
        >
          {copied ? 'Скопировано' : 'Копировать'}
        </Button>
        <Button onClick={onClose}>Закрыть</Button>
      </DialogActions>
    </Dialog>
  );
};
