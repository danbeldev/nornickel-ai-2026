import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
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

const createRequestId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `request-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const ChatPage = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatTitle, setChatTitle] = useState('Новый исследовательский чат');
  const [loading, setLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamingChatIdRef = useRef<string | null>(null);
  const initialRequestStartedRef = useRef(false);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const autoScrollRef = useRef(true);

  useEffect(() => {
    autoScrollRef.current = true;
    if (!chatId) {
      setMessages([]);
      setChatTitle('Новый исследовательский чат');
      return;
    }

    if (streamingChatIdRef.current === chatId) {
      return;
    }

    api.getChat(chatId).then((chat) => {
      setMessages(chat?.messages ?? []);
      setChatTitle(chat?.title ?? 'Чат не найден');
    });
  }, [chatId]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !autoScrollRef.current) {
      return undefined;
    }
    const frame = window.requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [messages]);

  useEffect(() => {
    if (
      chatId &&
      streamingChatIdRef.current &&
      streamingChatIdRef.current !== chatId
    ) {
      abortControllerRef.current?.abort();
    }
  }, [chatId]);

  useEffect(
    () => () => {
      abortControllerRef.current?.abort();
    },
    [],
  );

  const handleSend = useCallback(
    async ({
      text,
      mentions,
    }: {
      text: string;
      mentions: EntityMention[];
    }) => {
      const requestId = createRequestId();
      const localAssistantId = `assistant-${requestId}`;
      const request: AskAssistantRequest = {
        requestId,
        text,
        mentions,
      };
      const userMessage: ChatMessage = {
        id: `user-${requestId}`,
        role: 'user',
        text,
        mentions,
        status: 'completed',
        requestId,
        createdAt: new Date().toISOString(),
      };
      const assistantMessage: ChatMessage = {
        id: localAssistantId,
        role: 'assistant',
        text: '',
        citations: [],
        status: 'streaming',
        requestId,
        researchStatus: 'preparing',
        createdAt: new Date().toISOString(),
      };

      autoScrollRef.current = true;
      setMessages((current) => [
        ...current,
        userMessage,
        assistantMessage,
      ]);
      setLoading(true);

      const updateAssistant = (
        updater: (current: ChatMessage) => ChatMessage,
      ) => {
        setMessages((current) =>
          current.map((message) =>
            message.role === 'assistant' &&
            message.requestId === requestId
              ? updater(message)
              : message,
          ),
        );
      };

      try {
        let targetChatId = chatId;

        if (!targetChatId) {
          const chat = await api.createChat(request);
          targetChatId = chat.id;
          request.chatId = chat.id;
          setChatTitle(chat.title);
          streamingChatIdRef.current = chat.id;
          navigate(`/chat/${chat.id}`, { replace: true });
        } else {
          request.chatId = targetChatId;
        }

        streamingChatIdRef.current = targetChatId;
        const controller = new AbortController();
        abortControllerRef.current = controller;
        const response = await api.streamResearchAssistant(
          request,
          {
            onStarted: (serverMessage) =>
              updateAssistant((current) => ({
                ...serverMessage,
                text: current.text,
                citations: current.citations,
                researchStatus: current.researchStatus,
              })),
            onStatus: (researchStatus) =>
              updateAssistant((current) => ({
                ...current,
                researchStatus,
              })),
            onEvidence: (evidence) =>
              updateAssistant((current) => ({
                ...current,
                evidence,
              })),
            onDelta: (delta) =>
              updateAssistant((current) => ({
                ...current,
                text: current.text + delta,
                researchStatus: 'generating',
              })),
            onCitations: (citations) =>
              updateAssistant((current) => ({
                ...current,
                citations,
              })),
          },
          controller.signal,
        );

        if (!response) {
          throw new Error('Поток завершился без итогового сообщения');
        }
        updateAssistant(() => response.message);
      } catch (error) {
        const interrupted =
          error instanceof DOMException && error.name === 'AbortError';
        updateAssistant((current) => ({
          ...current,
          status: interrupted ? 'interrupted' : 'failed',
          error: interrupted
            ? 'Генерация была прервана'
            : error instanceof Error
              ? error.message
              : 'Не удалось получить ответ',
        }));
      } finally {
        abortControllerRef.current = null;
        streamingChatIdRef.current = null;
        setLoading(false);
      }
    },
    [chatId, navigate],
  );

  useEffect(() => {
    if (!chatId) {
      initialRequestStartedRef.current = false;
    }
  }, [chatId, location.key]);

  useEffect(() => {
    const state = location.state as
      | {
          initialRequest?: {
            text: string;
            mentions: EntityMention[];
          };
        }
      | null;

    if (
      chatId ||
      !state?.initialRequest ||
      initialRequestStartedRef.current
    ) {
      return;
    }

    initialRequestStartedRef.current = true;
    void handleSend(state.initialRequest);
  }, [chatId, handleSend, location.state]);

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

        <Box
          ref={messagesContainerRef}
          onScroll={(event) => {
            const container = event.currentTarget;
            const distanceFromBottom =
              container.scrollHeight -
              container.scrollTop -
              container.clientHeight;
            autoScrollRef.current = distanceFromBottom < 96;
          }}
          sx={{ flex: 1, overflowY: 'auto', px: 2 }}
        >
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
            <ChatComposer
              loading={loading}
              onCancel={() => abortControllerRef.current?.abort()}
              onSend={handleSend}
            />
          </Box>
        </Box>
      </Box>
    </WorkspaceLayout>
  );
};
