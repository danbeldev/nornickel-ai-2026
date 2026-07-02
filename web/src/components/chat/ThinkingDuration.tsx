import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import KeyboardArrowRightRoundedIcon from '@mui/icons-material/KeyboardArrowRightRounded';
import { ButtonBase, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { ChatMessage } from '../../data/types';

interface ThinkingDurationProps {
  status: ChatMessage['status'];
  createdAt?: string;
  durationMs?: number;
  expanded: boolean;
  onToggle: () => void;
}

const formatDuration = (milliseconds: number) => {
  if (milliseconds < 60_000) {
    return `${(milliseconds / 1000).toLocaleString('ru-RU', {
      minimumFractionDigits: milliseconds < 10_000 ? 1 : 0,
      maximumFractionDigits: 1,
    })} с`;
  }

  const minutes = Math.floor(milliseconds / 60_000);
  const seconds = Math.round((milliseconds % 60_000) / 1000);
  return `${minutes} мин ${seconds} с`;
};

export const ThinkingDuration = ({
  status,
  createdAt,
  durationMs,
  expanded,
  onToggle,
}: ThinkingDurationProps) => {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (status !== 'streaming') {
      return undefined;
    }

    const parsedStartedAt = createdAt ? Date.parse(createdAt) : Number.NaN;
    const startedAt = Number.isNaN(parsedStartedAt)
      ? Date.now()
      : parsedStartedAt;
    const updateElapsed = () =>
      setElapsedMs(Math.max(0, Date.now() - startedAt));

    updateElapsed();
    const interval = window.setInterval(updateElapsed, 100);
    return () => window.clearInterval(interval);
  }, [createdAt, status]);

  if (status !== 'streaming' && durationMs == null) {
    return null;
  }

  return (
    <ButtonBase
      onClick={onToggle}
      aria-expanded={expanded}
      aria-label={expanded ? 'Скрыть этапы обработки' : 'Показать этапы обработки'}
      sx={{
        mb: 1.25,
        color: 'text.secondary',
        borderRadius: 1,
        '&:hover': { color: 'text.primary' },
      }}
    >
      <Typography variant="body2">
        {status === 'streaming'
          ? `Работаю ${formatDuration(elapsedMs)}`
          : `Работал на протяжении ${formatDuration(durationMs ?? 0)}`}
      </Typography>
      {expanded ? (
        <KeyboardArrowDownRoundedIcon sx={{ ml: 0.4, fontSize: 18 }} />
      ) : (
        <KeyboardArrowRightRoundedIcon sx={{ ml: 0.4, fontSize: 18 }} />
      )}
    </ButtonBase>
  );
};
