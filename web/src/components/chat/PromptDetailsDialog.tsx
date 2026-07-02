import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material';
import { useState } from 'react';
import { ChatEvidence } from '../../data/types';

interface PromptDetailsDialogProps {
  open: boolean;
  evidence: ChatEvidence;
  onClose: () => void;
}

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
