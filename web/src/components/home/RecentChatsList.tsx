import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { ChatSummary } from '../../data/types';

interface RecentChatsListProps {
  items: ChatSummary[];
}

export const RecentChatsList = ({ items }: RecentChatsListProps) => {
  const recentChats = [...items]
    .sort((first, second) => Date.parse(second.date) - Date.parse(first.date))
    .slice(0, 5);

  return (
    <Paper
      component="section"
      sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography fontWeight={800}>Недавние чаты</Typography>
      </Box>
      <List disablePadding>
        {recentChats.map((chat) => (
          <ListItemButton
            key={chat.id}
            component={Link}
            to={`/chat/${chat.id}`}
            sx={{
              minHeight: 52,
              px: 2.5,
              borderBottom: '1px solid',
              borderColor: 'divider',
              '&:last-child': { borderBottom: 0 },
            }}
          >
            <ListItemIcon sx={{ minWidth: 36, color: 'text.secondary' }}>
              <ChatBubbleOutlineRoundedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={chat.title}
              slotProps={{
                primary: { noWrap: true, fontSize: 14, fontWeight: 600 },
              }}
            />
            <ArrowForwardRoundedIcon
              sx={{ ml: 1, color: 'text.secondary', fontSize: 18 }}
            />
          </ListItemButton>
        ))}
      </List>
    </Paper>
  );
};
