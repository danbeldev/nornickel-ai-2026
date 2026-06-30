import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChatComposer } from '../../components/chat/ChatComposer';
import { ChatMessageItem } from '../../components/chat/ChatMessageItem';
import { WorkspaceLayout } from '../../components/layout/WorkspaceLayout';
import api from '../../data/api';
import {
  AskAssistantRequest,
  ChatMessage,
  EntityMention,
} from '../../data/types';

const suggestions = [
  'Как термообработка влияет на прочность сплава X?',
  'Какие режимы уже исследовали для никелевых сплавов?',
  'Найди противоречия в результатах экспериментов',
];

export const ChatPage = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatTitle, setChatTitle] = useState('Новый исследовательский чат');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      setChatTitle('Новый исследовательский чат');
      return;
    }

    api.getChat(chatId).then((chat) => {
      setMessages(chat?.messages ?? []);
      setChatTitle(chat?.title ?? 'Чат не найден');
    });
  }, [chatId]);

  const handleSend = async ({
    text,
    mentions,
  }: {
    text: string;
    mentions: EntityMention[];
  }) => {
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      mentions,
    };

    setMessages((current) => [...current, userMessage]);
    setLoading(true);

    try {
      const request: AskAssistantRequest = {
        text,
        mentions,
      };

      if (!chatId) {
        const chat = await api.createChat(request);
        setMessages(chat.messages);
        setChatTitle(chat.title);
        navigate(`/chat/${chat.id}`, { replace: true });
        return;
      }

      request.chatId = chatId;
      const response = await api.askResearchAssistant(request);
      setMessages((current) => [...current, response.message]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <WorkspaceLayout>
      <Box
        sx={{
          height: 'calc(100vh - 72px)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box
          sx={{
            px: { xs: 2, md: 3 },
            py: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography fontWeight={800}>{chatTitle}</Typography>
          <Typography variant="caption" color="text.secondary">
            Контекст: вся база знаний
          </Typography>
        </Box>

        <Box sx={{ flex: 1, overflowY: 'auto', px: 2 }}>
          <Box
            sx={{
              width: '100%',
              maxWidth: 900,
              minHeight: '100%',
              mx: 'auto',
              py: 4,
            }}
          >
            {messages.length === 0 ? (
              <Stack
                alignItems="center"
                justifyContent="center"
                textAlign="center"
                sx={{ minHeight: '58vh' }}
              >
                <Box
                  sx={{
                    width: 46,
                    height: 46,
                    display: 'grid',
                    placeItems: 'center',
                    color: 'primary.main',
                    border: '1px solid',
                    borderColor: 'rgba(79,209,197,.3)',
                    borderRadius: 1.5,
                    backgroundColor: 'rgba(79,209,197,.08)',
                  }}
                >
                  <AutoAwesomeRoundedIcon />
                </Box>
                <Typography variant="h5" fontWeight={800} sx={{ mt: 2 }}>
                  Что вы хотите исследовать?
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 560 }}>
                  Задайте вопрос — система найдёт связанные документы,
                  эксперименты и выводы, а затем покажет источники ответа.
                </Typography>
                <Stack
                  direction="row"
                  useFlexGap
                  flexWrap="wrap"
                  justifyContent="center"
                  gap={1}
                  sx={{ mt: 3 }}
                >
                  {suggestions.map((suggestion) => (
                    <Chip
                      key={suggestion}
                      label={suggestion}
                      variant="outlined"
                      onClick={() =>
                        handleSend({ text: suggestion, mentions: [] })
                      }
                      sx={{ color: 'text.secondary', borderColor: 'divider' }}
                    />
                  ))}
                </Stack>
              </Stack>
            ) : (
              <Stack spacing={3}>
                {messages.map((message) => (
                  <ChatMessageItem key={message.id} message={message} />
                ))}
              </Stack>
            )}
          </Box>
        </Box>

        <Box
          sx={{
            px: 2,
            pt: 1.5,
            pb: 2,
            background:
              'linear-gradient(180deg, rgba(8,13,19,0), #080D13 24%)',
          }}
        >
          <Box sx={{ width: '100%', maxWidth: 900, mx: 'auto' }}>
            <ChatComposer loading={loading} onSend={handleSend} />
          </Box>
        </Box>
      </Box>
    </WorkspaceLayout>
  );
};
