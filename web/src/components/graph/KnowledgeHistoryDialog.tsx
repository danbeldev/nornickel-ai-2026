import {
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import api from '../../data/api';
import { KnowledgeEntityVersion } from '../../data/types';

interface Props {
  open: boolean;
  entityId: string;
  onClose: () => void;
}

export const KnowledgeHistoryDialog = ({ open, entityId, onClose }: Props) => {
  const [versions, setVersions] = useState<KnowledgeEntityVersion[]>([]);

  useEffect(() => {
    if (open) {
      api.getKnowledgeEntityVersions(entityId).then(setVersions);
    }
  }, [entityId, open]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>История знания</DialogTitle>
      <DialogContent>
        <Stack divider={<Divider flexItem />} spacing={1.5}>
          {versions.map((version) => (
            <Stack key={version.id} spacing={0.4} sx={{ py: 1 }}>
              <Typography fontWeight={800}>
                Версия {version.version} · {version.changeType}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date(version.changedAt).toLocaleString('ru-RU')}
              </Typography>
              {version.changeMessage && (
                <Typography variant="body2">{version.changeMessage}</Typography>
              )}
            </Stack>
          ))}
          {versions.length === 0 && (
            <Typography color="text.secondary">
              Предыдущих версий пока нет.
            </Typography>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
};
