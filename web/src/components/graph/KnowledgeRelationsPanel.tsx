import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import api from '../../data/api';
import {
  KnowledgeGraphConnection,
  KnowledgeGraphEntity,
} from '../../data/types';
import {
  getKnowledgeRelationLabel,
  knowledgeRelationTypes,
} from './graphConfig';

interface Props {
  entity: KnowledgeGraphEntity;
  entities: KnowledgeGraphEntity[];
  connections: KnowledgeGraphConnection[];
  onChanged: () => void;
}

export const KnowledgeRelationsPanel = ({
  entity,
  entities,
  connections,
  onChanged,
}: Props) => {
  const [editing, setEditing] = useState<KnowledgeGraphConnection | null>(null);
  const [relationType, setRelationType] = useState('');
  const [comment, setComment] = useState('');
  const [creating, setCreating] = useState(false);
  const [targetId, setTargetId] = useState('');
  const editable = entity.type !== 'document';
  const related = connections.filter(
    (connection) =>
      connection.source === entity.id || connection.target === entity.id,
  );
  const entityById = new Map(entities.map((item) => [item.id, item]));

  return (
    <Box sx={{ px: 2.5, pb: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography
          variant="caption"
          color="text.secondary"
          fontWeight={700}
          textTransform="uppercase"
        >
          Связи
        </Typography>
        {editable && (
          <Button
            size="small"
            startIcon={<AddRoundedIcon />}
            onClick={() => {
              setCreating(true);
              setTargetId('');
              setRelationType('');
              setComment('');
            }}
          >
            Добавить
          </Button>
        )}
      </Stack>
      <Stack spacing={0.75} sx={{ mt: 1 }}>
        {related.map((connection) => {
          const outgoing = connection.source === entity.id;
          const neighbor = entityById.get(
            outgoing ? connection.target : connection.source,
          );
          const relationEditable = editable && neighbor?.type !== 'document';
          return (
            <Stack
              key={connection.id}
              direction="row"
              alignItems="center"
              spacing={0.75}
              sx={{
                px: 1,
                py: 0.65,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
              }}
            >
              <Box minWidth={0} flex={1}>
                <Typography variant="caption" color="text.secondary">
                  {outgoing ? '→' : '←'} {getKnowledgeRelationLabel(connection.label)}
                </Typography>
                <Typography variant="body2" noWrap>
                  {neighbor?.title ?? 'Неизвестная сущность'}
                </Typography>
              </Box>
              {relationEditable && (
                <>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setEditing(connection);
                      setRelationType(connection.label);
                      setComment('');
                    }}
                  >
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={async () => {
                      if (!window.confirm('Удалить эту связь из графа?')) return;
                      await api.deleteKnowledgeConnection(
                        connection.id,
                        'Связь удалена экспертом',
                      );
                      onChanged();
                    }}
                  >
                    <DeleteOutlineRoundedIcon fontSize="small" />
                  </IconButton>
                </>
              )}
            </Stack>
          );
        })}
        {related.length === 0 && (
          <Typography variant="caption" color="text.secondary">
            Связи не найдены.
          </Typography>
        )}
      </Stack>

      <Dialog
        open={Boolean(editing) || creating}
        onClose={() => {
          setEditing(null);
          setCreating(false);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{creating ? 'Добавить связь' : 'Изменить связь'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {creating && (
              <FormControl>
                <InputLabel>Связать с</InputLabel>
                <Select
                  value={targetId}
                  label="Связать с"
                  onChange={(event) => setTargetId(event.target.value)}
                >
                  {entities
                    .filter(
                      (candidate) =>
                        candidate.id !== entity.id &&
                        candidate.type !== 'document',
                    )
                    .map((candidate) => (
                      <MenuItem key={candidate.id} value={candidate.id}>
                        {candidate.title} · {candidate.type}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            )}
            <FormControl>
              <InputLabel>Тип связи</InputLabel>
              <Select
                value={relationType}
                label="Тип связи"
                onChange={(event) => setRelationType(event.target.value)}
              >
                {knowledgeRelationTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {getKnowledgeRelationLabel(type)} · {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Комментарий"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            color="inherit"
            onClick={() => {
              setEditing(null);
              setCreating(false);
            }}
          >
            Отмена
          </Button>
          <Button
            variant="contained"
            disabled={!relationType.trim() || (creating && !targetId)}
            onClick={async () => {
              if (creating) {
                await api.createKnowledgeConnection(
                  entity.id,
                  targetId,
                  relationType,
                  comment,
                );
              } else if (editing) {
                await api.updateKnowledgeConnection(
                  editing.id,
                  relationType,
                  comment,
                );
              }
              setEditing(null);
              setCreating(false);
              onChanged();
            }}
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
