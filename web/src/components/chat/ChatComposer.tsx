import AlternateEmailRoundedIcon from '@mui/icons-material/AlternateEmailRounded';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded';
import StopRoundedIcon from '@mui/icons-material/StopRounded';
import {
  Box,
  Chip,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import api from '../../data/api';
import {
  EntityMention,
  MentionableEntity,
  MentionableEntityType,
} from '../../data/types';

interface ChatComposerSubmit {
  text: string;
  mentions: EntityMention[];
}

interface ChatComposerProps {
  loading: boolean;
  inlineSourcesEnabled: boolean;
  onCancel: () => void;
  onInlineSourcesChange: (enabled: boolean) => void;
  onSend: (request: ChatComposerSubmit) => void;
}

const entityTypeLabels: Record<MentionableEntityType, string> = {
  material: 'Материал',
  experiment: 'Эксперимент',
  document: 'Документ',
  data_issue: 'Проблема',
  property: 'Свойство',
  regime: 'Режим',
  equipment: 'Установка',
  team: 'Команда',
  conclusion: 'Вывод',
  process: 'Процесс',
  publication: 'Публикация',
  expert: 'Эксперт',
  facility: 'Площадка',
  technology: 'Технология',
  geography: 'География',
  economic_indicator: 'Экономический показатель',
  unclassified: 'Неопределённая сущность',
};

export const ChatComposer = ({
  loading,
  inlineSourcesEnabled,
  onCancel,
  onInlineSourcesChange,
  onSend,
}: ChatComposerProps) => {
  const [message, setMessage] = useState('');
  const [mentions, setMentions] = useState<EntityMention[]>([]);
  const [suggestions, setSuggestions] = useState<MentionableEntity[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const suggestionRefs = useRef<Array<HTMLDivElement | null>>([]);
  const mentionMatch = message.match(/@([^@\s]*)$/);
  const mentionQuery = mentionMatch?.[1] ?? null;

  useEffect(() => {
    if (mentionQuery === null) {
      setSuggestions([]);
      setActiveSuggestionIndex(0);
      return;
    }

    let active = true;

    api.searchMentionableEntities(mentionQuery).then((items) => {
      if (active) {
        setSuggestions(items);
        setActiveSuggestionIndex(0);
      }
    });

    return () => {
      active = false;
    };
  }, [mentionQuery]);

  useEffect(() => {
    suggestionRefs.current[activeSuggestionIndex]?.scrollIntoView({
      block: 'nearest',
    });
  }, [activeSuggestionIndex]);

  const submit = () => {
    const normalizedMessage = message.trim();

    if (!normalizedMessage || loading) return;

    const activeMentions = mentions.filter((mention) =>
      normalizedMessage.includes(`@${mention.label}`),
    );

    onSend({ text: normalizedMessage, mentions: activeMentions });
    setMessage('');
    setMentions([]);
    setSuggestions([]);
    setActiveSuggestionIndex(0);
  };

  const selectMention = (entity: MentionableEntity) => {
    const mentionStart = message.lastIndexOf('@');
    const prefix = mentionStart >= 0 ? message.slice(0, mentionStart) : message;

    setMessage(`${prefix}@${entity.label} `);
    setMentions((current) => {
      if (current.some((mention) => mention.id === entity.id)) return current;

      return [
        ...current,
        { id: entity.id, type: entity.type, label: entity.label },
      ];
    });
    setSuggestions([]);
    setActiveSuggestionIndex(0);
  };

  const removeMention = (mention: EntityMention) => {
    setMentions((current) =>
      current.filter((item) => item.id !== mention.id),
    );
    setMessage((current) =>
      current.replace(`@${mention.label}`, '').replace(/\s{2,}/g, ' '),
    );
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (suggestions.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveSuggestionIndex(
          (current) => (current + 1) % suggestions.length,
        );
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveSuggestionIndex(
          (current) =>
            (current - 1 + suggestions.length) % suggestions.length,
        );
        return;
      }

      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        selectMention(suggestions[activeSuggestionIndex]);
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        setSuggestions([]);
        setActiveSuggestionIndex(0);
        return;
      }
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <Box sx={{ position: 'relative' }}>
      {suggestions.length > 0 && (
        <Paper
          sx={{
            position: 'absolute',
            right: 0,
            bottom: 'calc(100% + 8px)',
            left: 0,
            zIndex: 5,
            maxHeight: 320,
            overflowY: 'auto',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1.5,
            boxShadow: '0 18px 50px rgba(0,0,0,.38)',
          }}
        >
          <Box sx={{ px: 2, py: 1.25, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary">
              Добавить сущность в контекст
            </Typography>
          </Box>
          <List disablePadding>
            {suggestions.map((entity, index) => (
              <ListItemButton
                key={`${entity.type}-${entity.id}`}
                ref={(element) => {
                  suggestionRefs.current[index] = element;
                }}
                selected={index === activeSuggestionIndex}
                onClick={() => selectMention(entity)}
                onMouseEnter={() => setActiveSuggestionIndex(index)}
                sx={{
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(79,209,197,.1)',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: 'primary.main' }}>
                  <AlternateEmailRoundedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={entity.label}
                  secondary={`${entityTypeLabels[entity.type]} · ${entity.subtitle}`}
                  slotProps={{
                    primary: { fontWeight: 700 },
                    secondary: { noWrap: true },
                  }}
                />
              </ListItemButton>
            ))}
          </List>
        </Paper>
      )}

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
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
        {mentions.length > 0 && (
          <Stack
            direction="row"
            useFlexGap
            flexWrap="wrap"
            gap={0.75}
            sx={{ px: 1, pt: 0.75, pb: 0.25 }}
          >
            {mentions.map((mention) => (
              <Chip
                key={`${mention.type}-${mention.id}`}
                size="small"
                label={`@${mention.label}`}
                onDelete={() => removeMention(mention)}
                color="primary"
                variant="outlined"
              />
            ))}
          </Stack>
        )}

        <TextField
          fullWidth
          multiline
          maxRows={6}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Задайте вопрос или напишите @ для добавления сущности…"
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

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
          sx={{ px: 0.5, pb: 0.25 }}
        >
          <Chip
            size="small"
            icon={<ArticleOutlinedIcon />}
            label="Источники в тексте"
            clickable
            color={inlineSourcesEnabled ? 'primary' : 'default'}
            variant={inlineSourcesEnabled ? 'filled' : 'outlined'}
            onClick={() => onInlineSourcesChange(!inlineSourcesEnabled)}
            sx={{
              borderRadius: 1,
              color: inlineSourcesEnabled
                ? 'primary.contrastText'
                : 'text.secondary',
            }}
          />
          <IconButton
            type={loading ? 'button' : 'submit'}
            disabled={!loading && !message.trim()}
            aria-label={loading ? 'Остановить генерацию' : 'Отправить сообщение'}
            onClick={loading ? onCancel : undefined}
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
              <StopRoundedIcon fontSize="small" />
            ) : (
              <ArrowUpwardRoundedIcon fontSize="small" />
            )}
          </IconButton>
        </Stack>
      </Box>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', mt: 1, textAlign: 'center' }}
      >
        Используйте @, чтобы добавить материал, документ или другую сущность
      </Typography>
    </Box>
  );
};
