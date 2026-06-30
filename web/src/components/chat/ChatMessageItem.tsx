import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { ChatMessage } from '../../data/types';
import { getEntityPath } from '../../utils/entityRoutes';

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
          backgroundColor: isAssistant
            ? 'background.paper'
            : 'rgba(79,209,197,.08)',
        }}
      >
        <Typography variant="body2" lineHeight={1.75}>
          {message.text}
        </Typography>

        {message.mentions && message.mentions.length > 0 && (
          <Stack
            direction="row"
            useFlexGap
            flexWrap="wrap"
            gap={0.75}
            sx={{ mt: 1.5 }}
          >
            {message.mentions.map((mention) => (
              <Chip
                key={`${mention.type}-${mention.id}`}
                component={Link}
                to={getEntityPath(mention.type, mention.id)}
                clickable
                size="small"
                label={`@${mention.label}`}
                color="primary"
                variant="outlined"
              />
            ))}
          </Stack>
        )}

        {message.citations && message.citations.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 1.5 }} />
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={800}
            >
              ИСТОЧНИКИ И СВЯЗАННЫЕ ДАННЫЕ
            </Typography>
            <Stack spacing={0.75} sx={{ mt: 1 }}>
              {message.citations.map((citation) => (
                <Button
                  key={citation.id}
                  component={Link}
                  to={getEntityPath(
                    citation.entityType,
                    citation.entityId,
                  )}
                  color="inherit"
                  startIcon={<ArticleOutlinedIcon />}
                  endIcon={<OpenInNewRoundedIcon />}
                  sx={{
                    justifyContent: 'flex-start',
                    px: 1.25,
                    py: 0.8,
                    border: '1px solid',
                    borderColor: 'divider',
                    textAlign: 'left',
                  }}
                >
                  <Box minWidth={0} flex={1}>
                    <Typography variant="body2" fontWeight={700} noWrap>
                      {citation.label}
                      {citation.page ? ` · стр. ${citation.page}` : ''}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      noWrap
                      sx={{ display: 'block' }}
                    >
                      {citation.description}
                    </Typography>
                  </Box>
                </Button>
              ))}
            </Stack>
          </Box>
        )}
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
