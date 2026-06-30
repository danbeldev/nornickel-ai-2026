import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import { Avatar, Paper, Stack, Typography } from '@mui/material';
import { ChatMessage } from '../../data/types';

interface ChatMessageItemProps {
  message: ChatMessage;
}

export const ChatMessageItem = ({ message }: ChatMessageItemProps) => {
  const isAssistant = message.role === 'assistant';

  return (
    <Stack
      direction="row"
      spacing={1.5}
      alignItems="flex-start"
      justifyContent={isAssistant ? 'flex-start' : 'flex-end'}
    >
      {isAssistant && (
        <Avatar
          sx={{
            width: 32,
            height: 32,
            color: 'primary.main',
            backgroundColor: 'rgba(79,209,197,.1)',
          }}
        >
          <AutoAwesomeRoundedIcon fontSize="small" />
        </Avatar>
      )}
      <Paper
        sx={{
          maxWidth: 760,
          px: 2,
          py: 1.5,
          border: '1px solid',
          borderColor: isAssistant ? 'divider' : 'rgba(79,209,197,.25)',
          borderRadius: 1.5,
          backgroundColor: isAssistant ? 'background.paper' : 'rgba(79,209,197,.08)',
        }}
      >
        <Typography variant="body2" lineHeight={1.75}>
          {message.text}
        </Typography>
      </Paper>
      {!isAssistant && (
        <Avatar
          sx={{
            width: 32,
            height: 32,
            color: 'text.secondary',
            backgroundColor: '#18232D',
          }}
        >
          <PersonOutlineRoundedIcon fontSize="small" />
        </Avatar>
      )}
    </Stack>
  );
};
