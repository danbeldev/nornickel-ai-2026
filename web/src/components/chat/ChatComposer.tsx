import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded';
import {
  Box,
  CircularProgress,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import { FormEvent, KeyboardEvent, useState } from 'react';

interface ChatComposerProps {
  loading: boolean;
  onSend: (message: string) => void;
}

export const ChatComposer = ({ loading, onSend }: ChatComposerProps) => {
  const [message, setMessage] = useState('');

  const submit = () => {
    const normalizedMessage = message.trim();

    if (!normalizedMessage || loading) return;

    onSend(normalizedMessage);
    setMessage('');
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <Box>
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 0.75,
          p: 0.75,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1.5,
          backgroundColor: '#101820',
          '&:focus-within': {
            borderColor: 'primary.main',
            boxShadow: '0 0 0 3px rgba(79,209,197,.08)',
          },
        }}
      >
        <TextField
          fullWidth
          multiline
          maxRows={6}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Задайте вопрос по материалам и экспериментам…"
          variant="standard"
          slotProps={{
            input: {
              disableUnderline: true,
              startAdornment: (
                <InputAdornment position="start">
                  <IconButton size="small" aria-label="Прикрепить документ">
                    <AttachFileRoundedIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
          sx={{ px: 0.5, py: 0.4 }}
        />
        <IconButton
          type="submit"
          disabled={!message.trim() || loading}
          aria-label="Отправить сообщение"
          sx={{
            width: 38,
            height: 38,
            color: 'primary.contrastText',
            backgroundColor: 'primary.main',
            borderRadius: 1,
            '&:hover': { backgroundColor: 'primary.light' },
            '&.Mui-disabled': {
              color: 'text.disabled',
              backgroundColor: 'action.disabledBackground',
            },
          }}
        >
          {loading ? (
            <CircularProgress size={18} color="inherit" />
          ) : (
            <ArrowUpwardRoundedIcon fontSize="small" />
          )}
        </IconButton>
      </Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', mt: 1, textAlign: 'center' }}
      >
        Ответы формируются по базе знаний — проверяйте ссылки на источники
      </Typography>
    </Box>
  );
};
