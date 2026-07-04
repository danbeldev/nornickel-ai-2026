import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import { useEffect, useState } from 'react';
import {
  ExtractedEntity,
  ExtractedRelation,
  SourceReference,
} from '../../data/types';
import {
  getKnowledgeRelationLabel,
  knowledgeRelationTypes,
} from '../graph/graphConfig';

interface ExtractionRelationEditorDialogProps {
  open: boolean;
  relation?: ExtractedRelation;
  entities: ExtractedEntity[];
  documentId: string;
  defaultSource?: SourceReference;
  onClose: () => void;
  onSave: (relation: ExtractedRelation) => void;
}

const createId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const ExtractionRelationEditorDialog = ({
  open,
  relation,
  entities,
  documentId,
  defaultSource,
  onClose,
  onSave,
}: ExtractionRelationEditorDialogProps) => {
  const [sourceId, setSourceId] = useState('');
  const [type, setType] = useState(knowledgeRelationTypes[0] ?? 'RELATED_TO');
  const [targetId, setTargetId] = useState('');

  useEffect(() => {
    if (!open) return;
    setSourceId(relation?.sourceId ?? entities[0]?.id ?? '');
    setType(relation?.type ?? knowledgeRelationTypes[0] ?? 'RELATED_TO');
    setTargetId(relation?.targetId ?? entities[1]?.id ?? entities[0]?.id ?? '');
  }, [entities, open, relation]);

  const save = () => {
    if (!sourceId || !targetId || sourceId === targetId) return;
    onSave({
      id: relation?.id ?? `draft-relation-${createId()}`,
      sourceId,
      type,
      targetId,
      source: relation?.source ?? defaultSource ?? { documentId },
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {relation ? 'Редактировать связь' : 'Добавить связь'}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <TextField
            select
            label="Исходная сущность"
            value={sourceId}
            onChange={(event) => setSourceId(event.target.value)}
            fullWidth
          >
            {entities.map((entity) => (
              <MenuItem key={entity.id} value={entity.id}>
                {entity.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Тип связи"
            value={type}
            onChange={(event) => setType(event.target.value)}
            fullWidth
          >
            {knowledgeRelationTypes.map((relationType) => (
              <MenuItem key={relationType} value={relationType}>
                {getKnowledgeRelationLabel(relationType)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Целевая сущность"
            value={targetId}
            onChange={(event) => setTargetId(event.target.value)}
            fullWidth
          >
            {entities.map((entity) => (
              <MenuItem key={entity.id} value={entity.id}>
                {entity.name}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose}>
          Отмена
        </Button>
        <Button
          variant="contained"
          disabled={!sourceId || !targetId || sourceId === targetId}
          onClick={save}
        >
          Сохранить
        </Button>
      </DialogActions>
    </Dialog>
  );
};
