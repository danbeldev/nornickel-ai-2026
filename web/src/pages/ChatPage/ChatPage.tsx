import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import {
  Box,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ChatComposer } from '../../components/chat/ChatComposer';
import { ChatMessageItem } from '../../components/chat/ChatMessageItem';
import { WorkspaceLayout } from '../../components/layout/WorkspaceLayout';
import api from '../../data/api';
import {
  AskAssistantRequest,
  ChatMessage,
  ChatSearchMode,
  EntityMention,
} from '../../data/types';

const knowledgeBaseSuggestions = [
  'Как термообработка влияет на прочность сплава X?',
  'Какие режимы уже исследовали для никелевых сплавов?',
  'Найди противоречия в результатах экспериментов',
];

const openSourceSuggestions = [
  'Найди последние публикации о переработке никелевых отходов',
  'Какие технологии очистки шахтных вод применяют в мировой практике?',
  'Найди новые исследования по электроэкстракции никеля',
];

const createRequestId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `request-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const ChatPage = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [inlineSourcesEnabled, setInlineSourcesEnabled] = useState(
    () => window.localStorage.getItem('chat-inline-sources') !== 'false',
  );
  const [searchMode, setSearchMode] = useState<ChatSearchMode>(
    () =>
      window.localStorage.getItem('chat-search-mode') === 'open_sources'
        ? 'open_sources'
        : 'knowledge_base',
  );
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamingChatIdRef = useRef<string | null>(null);
  const initialRequestStartedRef = useRef(false);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const autoScrollRef = useRef(true);

  useEffect(() => {
    autoScrollRef.current = true;
    if (!chatId) {
      setMessages([]);
      return;
    }

    if (streamingChatIdRef.current === chatId) {
      return;
    }

    api.getChat(chatId).then((chat) => {
      setMessages(chat?.messages ?? []);
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
    const hasDetachedGeneration =
      Boolean(chatId) &&
      streamingChatIdRef.current !== chatId &&
      messages.some(
        (message) =>
          message.role === 'assistant' && message.status === 'streaming',
      );
    if (!chatId || !hasDetachedGeneration) {
      return undefined;
    }

    const refresh = () => {
      api.getChat(chatId).then((chat) => {
        if (!chat) return;
        setMessages(chat.messages);
      });
    };
    const interval = window.setInterval(refresh, 1500);
    return () => window.clearInterval(interval);
  }, [chatId, messages]);

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
      searchMode: requestedSearchMode,
    }: {
      text: string;
      mentions: EntityMention[];
      searchMode?: ChatSearchMode;
    }) => {
      const activeSearchMode = requestedSearchMode ?? searchMode;
      const requestId = createRequestId();
      const localAssistantId = `assistant-${requestId}`;
      const request: AskAssistantRequest = {
        requestId,
        text,
        mentions,
        searchMode: activeSearchMode,
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
        statusHistory: [],
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
            onStatusEvent: (statusEvent) =>
              updateAssistant((current) => ({
                ...current,
                statusHistory: [
                  ...(current.statusHistory ?? []).filter(
                    (item) =>
                      item.stage !== statusEvent.stage ||
                      item.timestamp !== statusEvent.timestamp,
                  ),
                  statusEvent,
                ],
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
          (error instanceof DOMException && error.name === 'AbortError') ||
          (error instanceof Error &&
            /прерван|остановлен/i.test(error.message));
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
    [chatId, navigate, searchMode],
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
            searchMode?: ChatSearchMode;
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

  const activeStreamingMessage = [...messages]
    .reverse()
    .find(
      (message) =>
        message.role === 'assistant' && message.status === 'streaming',
    );
  const chatBusy = loading || Boolean(activeStreamingMessage);
  const suggestions =
    searchMode === 'open_sources'
      ? openSourceSuggestions
      : knowledgeBaseSuggestions;

  const handleCancel = async () => {
    if (chatId && activeStreamingMessage?.requestId) {
      try {
        await api.cancelResearchAssistant(
          chatId,
          activeStreamingMessage.requestId,
        );
      } catch {
        // The stream can finish between rendering the button and this request.
      } finally {
        abortControllerRef.current?.abort();
      }
      return;
    }
    abortControllerRef.current?.abort();
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
                  {searchMode === 'open_sources'
                    ? 'Задайте вопрос — система найдёт информацию в интернете и покажет использованные страницы и цитаты.'
                    : 'Задайте вопрос — система найдёт связанные документы, эксперименты и выводы, а затем покажет источники ответа.'}
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
                        handleSend({
                          text: suggestion,
                          mentions: [],
                          searchMode,
                        })
                      }
                      sx={{ color: 'text.secondary', borderColor: 'divider' }}
                    />
                  ))}
                </Stack>
              </Stack>
            ) : (
              <Stack spacing={3}>
                {messages.map((message) => (
                  <ChatMessageItem
                    key={message.id}
                    message={message}
                    inlineSourcesEnabled={inlineSourcesEnabled}
                  />
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
              loading={chatBusy}
              inlineSourcesEnabled={inlineSourcesEnabled}
              searchMode={searchMode}
              onCancel={() => void handleCancel()}
              onInlineSourcesChange={(enabled) => {
                setInlineSourcesEnabled(enabled);
                window.localStorage.setItem(
                  'chat-inline-sources',
                  String(enabled),
                );
              }}
              onSearchModeChange={(mode) => {
                setSearchMode(mode);
                window.localStorage.setItem('chat-search-mode', mode);
              }}
              onSend={handleSend}
            />
          </Box>
        </Box>
      </Box>
    </WorkspaceLayout>
  );
};
