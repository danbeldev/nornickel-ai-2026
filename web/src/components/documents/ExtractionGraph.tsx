import { Box, Paper, Stack, Typography } from '@mui/material';
import { useMemo, useState } from 'react';
import {
  DocumentExtractionResult,
  KnowledgeGraphConnection,
  KnowledgeGraphEntity,
} from '../../data/types';
import { KnowledgeGraphCanvas } from '../graph/KnowledgeGraphCanvas';
import { knowledgeEntityConfig } from '../graph/graphConfig';

interface ExtractionGraphProps {
  extraction: DocumentExtractionResult;
}

const buildEntities = (
  extraction: DocumentExtractionResult,
): KnowledgeGraphEntity[] => {
  const count = extraction.entities.length;
  const columns = Math.max(1, Math.ceil(Math.sqrt(count)));

  return extraction.entities.map((entity, index) => ({
    id: entity.id,
    type: entity.type,
    title: entity.name,
    subtitle: knowledgeEntityConfig[entity.type].label,
    description:
      entity.source.quote
      ?? entity.attributes
        .map((attribute) =>
          `${attribute.name}: ${String(attribute.value)}${
            attribute.unit ? ` ${attribute.unit}` : ''
          }`,
        )
        .join('; '),
    position:
      count <= 1
        ? { x: 260, y: 120 }
        : {
            x: (index % columns) * 260,
            y: Math.floor(index / columns) * 150,
          },
    attributes: entity.attributes,
    sources: [entity.source],
    confidence: entity.confidence ?? 0.7,
    verificationStatus: entity.verificationStatus ?? 'EXTRACTED',
    geography: entity.geography,
    publicationYear: entity.year,
    language: entity.language,
    version: 1,
    updatedAt: '',
  }));
};

const buildConnections = (
  extraction: DocumentExtractionResult,
  entityIds: Set<string>,
): KnowledgeGraphConnection[] =>
  extraction.relations
    .filter(
      (relation) =>
        entityIds.has(relation.sourceId)
        && entityIds.has(relation.targetId),
    )
    .map((relation) => ({
      id: relation.id,
      source: relation.sourceId,
      target: relation.targetId,
      label: relation.type,
    }));

export const ExtractionGraph = ({ extraction }: ExtractionGraphProps) => {
  const [selectedEntity, setSelectedEntity] =
    useState<KnowledgeGraphEntity | null>(null);
  const entities = useMemo(
    () => buildEntities(extraction),
    [extraction],
  );
  const connections = useMemo(
    () =>
      buildConnections(
        extraction,
        new Set(entities.map((entity) => entity.id)),
      ),
    [entities, extraction],
  );

  return (
    <Paper
      variant="outlined"
      sx={{ overflow: 'hidden', borderRadius: 1.5 }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ sm: 'center' }}
        justifyContent="space-between"
        gap={0.5}
        sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}
      >
        <Box>
          <Typography fontWeight={800}>Граф извлечённых знаний</Typography>
          <Typography variant="caption" color="text.secondary">
            Сущности и связи, найденные только в загруженном документе
          </Typography>
        </Box>
        {selectedEntity && (
          <Typography variant="body2" color="text.secondary">
            Выбрано: {selectedEntity.title}
          </Typography>
        )}
      </Stack>
      {entities.length > 0 ? (
        <KnowledgeGraphCanvas
          entities={entities}
          connections={connections}
          selectedEntityId={selectedEntity?.id}
          onSelectEntity={setSelectedEntity}
          minHeight={460}
        />
      ) : (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ p: 3, textAlign: 'center' }}
        >
          В документе пока не найдено сущностей для построения графа.
        </Typography>
      )}
    </Paper>
  );
};
