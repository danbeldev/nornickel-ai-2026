import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import api from '../../data/api';
import { KnowledgeGraphEntity } from '../../data/types';

interface Props {
  open: boolean;
  entity: KnowledgeGraphEntity;
  entities: KnowledgeGraphEntity[];
  onClose: () => void;
  onMerged: () => void;
}

export const KnowledgeMergeDialog = ({
  open,
  entity,
  entities,
  onClose,
  onMerged,
}: Props) => {
  const [targetId, setTargetId] = useState('');
  const [comment, setComment] = useState('');
  const candidates = useMemo(
    () =>
      entities.filter(
        (candidate) =>
          candidate.type === entity.type && candidate.id !== entity.id,
      ),
    [entities, entity],
  );

  useEffect(() => {
    if (open) {
      setTargetId('');
      setComment('');
    }
  }, [entity.id, open]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Объединить дубли</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <FormControl>
            <InputLabel>Основная сущность</InputLabel>
            <Select
              value={targetId}
              label="Основная сущность"
              onChange={(event) => setTargetId(event.target.value)}
            >
              {candidates.map((candidate) => (
                <MenuItem key={candidate.id} value={candidate.id}>
                  {candidate.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Комментарий"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Почему сущности считаются дублями"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose}>Отмена</Button>
        <Button
          variant="contained"
          disabled={!targetId}
          onClick={async () => {
            await api.mergeKnowledgeEntity(entity.id, targetId, comment);
            onMerged();
            onClose();
          }}
        >
          Объединить
        </Button>
      </DialogActions>
    </Dialog>
  );
};
