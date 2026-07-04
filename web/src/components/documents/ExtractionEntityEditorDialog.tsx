import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import { useEffect, useState } from 'react';
import {
  EntityAttribute,
  ExtractedEntity,
  KnowledgeEntityType,
  SourceReference,
} from '../../data/types';
import { knowledgeEntityConfig } from '../graph/graphConfig';

interface ExtractionEntityEditorDialogProps {
  open: boolean;
  entity?: ExtractedEntity;
  documentId: string;
  defaultSource?: SourceReference;
  onClose: () => void;
  onSave: (entity: ExtractedEntity) => void;
}

const entityTypes = Object.keys(
  knowledgeEntityConfig,
) as KnowledgeEntityType[];

const createId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const normalizeAttribute = (attribute: EntityAttribute): EntityAttribute => {
  const value = String(attribute.value).trim();
  const numericValue = /^-?\d+(?:[.,]\d+)?$/.test(value)
    ? Number(value.replace(',', '.'))
    : undefined;

  return {
    ...attribute,
    value,
    unit: attribute.unit?.trim() || undefined,
    numericValue,
    normalizedUnit: attribute.unit?.trim() || undefined,
  };
};

export const ExtractionEntityEditorDialog = ({
  open,
  entity,
  documentId,
  defaultSource,
  onClose,
  onSave,
}: ExtractionEntityEditorDialogProps) => {
  const [name, setName] = useState('');
  const [type, setType] =
    useState<KnowledgeEntityType>('unclassified');
  const [attributes, setAttributes] = useState<EntityAttribute[]>([]);

  useEffect(() => {
    if (!open) return;
    setName(entity?.name ?? '');
    setType(entity?.type ?? 'unclassified');
    setAttributes(entity?.attributes.map((attribute) => ({ ...attribute })) ?? []);
  }, [entity, open]);

  const updateAttribute = (
    index: number,
    field: 'name' | 'value' | 'unit',
    value: string,
  ) => {
    setAttributes((current) =>
      current.map((attribute, attributeIndex) =>
        attributeIndex === index
          ? { ...attribute, [field]: value }
          : attribute,
      ),
    );
  };

  const save = () => {
    const normalizedName = name.trim();
    if (!normalizedName) return;

    onSave({
      id: entity?.id ?? `draft-entity-${createId()}`,
      type,
      name: normalizedName,
      attributes: attributes
        .filter((attribute) => attribute.name.trim())
        .map(normalizeAttribute),
      source: entity?.source ?? defaultSource ?? { documentId },
      confidence: entity?.confidence,
      verificationStatus: entity?.verificationStatus,
      geography: entity?.geography,
      year: entity?.year,
      language: entity?.language,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {entity ? 'Редактировать сущность' : 'Добавить сущность'}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <TextField
            autoFocus
            label="Название"
            value={name}
            onChange={(event) => setName(event.target.value)}
            fullWidth
          />
          <TextField
            select
            label="Тип сущности"
            value={type}
            onChange={(event) =>
              setType(event.target.value as KnowledgeEntityType)
            }
            fullWidth
          >
            {entityTypes.map((entityType) => (
              <MenuItem key={entityType} value={entityType}>
                {knowledgeEntityConfig[entityType].label}
              </MenuItem>
            ))}
          </TextField>

          <Stack spacing={1}>
            {attributes.map((attribute, index) => (
              <Stack
                key={index}
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                alignItems={{ sm: 'center' }}
              >
                <TextField
                  size="small"
                  label="Параметр"
                  value={attribute.name}
                  onChange={(event) =>
                    updateAttribute(index, 'name', event.target.value)
                  }
                  sx={{ flex: 1 }}
                />
                <TextField
                  size="small"
                  label="Значение"
                  value={String(attribute.value)}
                  onChange={(event) =>
                    updateAttribute(index, 'value', event.target.value)
                  }
                  sx={{ flex: 1 }}
                />
                <TextField
                  size="small"
                  label="Единица"
                  value={attribute.unit ?? ''}
                  onChange={(event) =>
                    updateAttribute(index, 'unit', event.target.value)
                  }
                  sx={{ width: { sm: 120 } }}
                />
                <IconButton
                  aria-label="Удалить параметр"
                  color="error"
                  onClick={() =>
                    setAttributes((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                >
                  <DeleteOutlineRoundedIcon fontSize="small" />
                </IconButton>
              </Stack>
            ))}
            <Button
              startIcon={<AddRoundedIcon />}
              onClick={() =>
                setAttributes((current) => [
                  ...current,
                  { name: '', value: '', unit: '' },
                ])
              }
              sx={{ alignSelf: 'flex-start' }}
            >
              Добавить параметр
            </Button>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose}>
          Отмена
        </Button>
        <Button variant="contained" disabled={!name.trim()} onClick={save}>
          Сохранить
        </Button>
      </DialogActions>
    </Dialog>
  );
};
