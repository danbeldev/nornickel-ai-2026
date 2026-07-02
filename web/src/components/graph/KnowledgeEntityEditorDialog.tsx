import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import {
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
} from '@mui/material';
import { useEffect, useState } from 'react';
import {
  EntityAttribute,
  KnowledgeGraphEntity,
  UpdateKnowledgeEntityRequest,
} from '../../data/types';
import { knowledgeEntityConfig } from './graphConfig';

interface Props {
  open: boolean;
  entity: KnowledgeGraphEntity;
  saving: boolean;
  onClose: () => void;
  onSave: (request: UpdateKnowledgeEntityRequest) => void;
}

export const KnowledgeEntityEditorDialog = ({
  open,
  entity,
  saving,
  onClose,
  onSave,
}: Props) => {
  const [draft, setDraft] = useState<UpdateKnowledgeEntityRequest>({
    type: entity.type,
    title: entity.title,
    description: entity.description,
    attributes: entity.attributes,
    confidence: entity.confidence ?? 0.7,
    verificationStatus: entity.verificationStatus ?? 'REVIEWED',
    geography: entity.geography,
    publicationYear: entity.publicationYear,
    language: entity.language,
    changeMessage: '',
  });

  useEffect(() => {
    if (!open) return;
    setDraft({
      type: entity.type,
      title: entity.title,
      description: entity.description,
      attributes: entity.attributes.map((attribute) => ({ ...attribute })),
      confidence: entity.confidence ?? 0.7,
      verificationStatus: entity.verificationStatus ?? 'REVIEWED',
      geography: entity.geography,
      publicationYear: entity.publicationYear,
      language: entity.language,
      changeMessage: '',
    });
  }, [entity, open]);

  const updateAttribute = (
    index: number,
    patch: Partial<EntityAttribute>,
  ) => {
    setDraft((current) => ({
      ...current,
      attributes: current.attributes.map((attribute, itemIndex) =>
        itemIndex === index ? { ...attribute, ...patch } : attribute,
      ),
    }));
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Проверка и корректировка знания</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <FormControl size="small">
            <InputLabel>Тип сущности</InputLabel>
            <Select
              value={draft.type}
              label="Тип сущности"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  type: event.target.value as typeof current.type,
                }))
              }
            >
              {Object.entries(knowledgeEntityConfig)
                .filter(([type]) => type !== 'document')
                .map(([type, config]) => (
                <MenuItem key={type} value={type}>
                  {config.label}
                </MenuItem>
                ))}
            </Select>
          </FormControl>
          <TextField
            label="Название"
            value={draft.title}
            onChange={(event) =>
              setDraft((current) => ({ ...current, title: event.target.value }))
            }
          />
          <TextField
            label="Описание"
            multiline
            minRows={3}
            value={draft.description}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              fullWidth
              label="География"
              value={draft.geography ?? ''}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  geography: event.target.value || undefined,
                }))
              }
            />
            <TextField
              fullWidth
              label="Год"
              type="number"
              value={draft.publicationYear ?? ''}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  publicationYear: event.target.value
                    ? Number(event.target.value)
                    : undefined,
                }))
              }
            />
            <TextField
              fullWidth
              label="Язык"
              value={draft.language ?? ''}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  language: event.target.value || undefined,
                }))
              }
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              fullWidth
              label="Достоверность"
              type="number"
              slotProps={{ htmlInput: { min: 0, max: 1, step: 0.05 } }}
              value={draft.confidence}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  confidence: Math.max(0, Math.min(1, Number(event.target.value))),
                }))
              }
            />
            <FormControl fullWidth>
              <InputLabel>Статус проверки</InputLabel>
              <Select
                value={draft.verificationStatus}
                label="Статус проверки"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    verificationStatus: event.target.value,
                  }))
                }
              >
                <MenuItem value="EXTRACTED">Извлечено автоматически</MenuItem>
                <MenuItem value="REVIEWED">Проверено экспертом</MenuItem>
                <MenuItem value="DISPUTED">Спорное знание</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          {draft.attributes.map((attribute, index) => (
            <Stack key={`${attribute.name}-${index}`} direction="row" spacing={1}>
              <TextField
                size="small"
                label="Параметр"
                value={attribute.name}
                onChange={(event) =>
                  updateAttribute(index, { name: event.target.value })
                }
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                label="Значение"
                value={String(attribute.value)}
                onChange={(event) => {
                  const value = event.target.value;
                  const numericValue =
                    value.trim() && Number.isFinite(Number(value.replace(',', '.')))
                      ? Number(value.replace(',', '.'))
                      : undefined;
                  updateAttribute(index, {
                    value,
                    numericValue,
                    operator: numericValue == null ? undefined : '=',
                    normalizedUnit: undefined,
                  });
                }}
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                label="Единица"
                value={attribute.unit ?? ''}
                onChange={(event) =>
                  updateAttribute(index, {
                    unit: event.target.value || undefined,
                    normalizedUnit: event.target.value || undefined,
                  })
                }
                sx={{ width: 120 }}
              />
              <IconButton
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    attributes: current.attributes.filter(
                      (_, itemIndex) => itemIndex !== index,
                    ),
                  }))
                }
              >
                <DeleteOutlineRoundedIcon />
              </IconButton>
            </Stack>
          ))}
          <Button
            startIcon={<AddRoundedIcon />}
            onClick={() =>
              setDraft((current) => ({
                ...current,
                attributes: [
                  ...current.attributes,
                  { name: 'Новый параметр', value: '' },
                ],
              }))
            }
            sx={{ alignSelf: 'flex-start' }}
          >
            Добавить параметр
          </Button>
          <TextField
            label="Комментарий к изменению"
            value={draft.changeMessage ?? ''}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                changeMessage: event.target.value,
              }))
            }
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose}>Отмена</Button>
        <Button
          variant="contained"
          disabled={saving || !draft.title.trim() || !draft.description.trim()}
          onClick={() => onSave(draft)}
        >
          Сохранить новую версию
        </Button>
      </DialogActions>
    </Dialog>
  );
};
