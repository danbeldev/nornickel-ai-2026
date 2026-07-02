import { useMemo } from 'react';
import {
  ChatEvidence,
  KnowledgeGraphConnection,
  KnowledgeGraphEntity,
} from '../../data/types';
import { knowledgeEntityConfig } from '../graph/graphConfig';
import { KnowledgeGraphCanvas } from '../graph/KnowledgeGraphCanvas';

interface EvidenceGraphProps {
  evidence: ChatEvidence;
  minHeight?: number;
  compact?: boolean;
  selectedEntityId?: string | null;
  onSelectEntity?: (entity: KnowledgeGraphEntity | null) => void;
}

const buildEntities = (evidence: ChatEvidence): KnowledgeGraphEntity[] => {
  const count = evidence.entities.length;
  const columns = Math.max(1, Math.ceil(Math.sqrt(count)));

  return evidence.entities.map((entity, index) => {
    return {
      id: entity.id,
      type: entity.type ?? 'unclassified',
      title: entity.label,
      subtitle: knowledgeEntityConfig[entity.type ?? 'unclassified'].label,
      description: entity.description,
      position:
        count <= 1
          ? { x: 260, y: 120 }
          : {
              x: (index % columns) * 300,
              y: Math.floor(index / columns) * 160,
            },
      attributes: [],
      sources: [],
    };
  });
};

const buildConnections = (
  evidence: ChatEvidence,
  entityIds: Set<string>,
): KnowledgeGraphConnection[] =>
  evidence.paths
    .filter(
      (path) =>
        entityIds.has(path.sourceId) && entityIds.has(path.targetId),
    )
    .map((path, index) => ({
      id: `evidence-${index}-${path.sourceId}-${path.targetId}`,
      source: path.sourceId,
      target: path.targetId,
      label: path.relationship,
    }));

export const EvidenceGraph = ({
  evidence,
  minHeight = 260,
  compact = true,
  selectedEntityId,
  onSelectEntity = () => undefined,
}: EvidenceGraphProps) => {
  const entities = useMemo(() => buildEntities(evidence), [evidence]);
  const connections = useMemo(
    () => buildConnections(evidence, new Set(entities.map((entity) => entity.id))),
    [entities, evidence],
  );

  return (
    <KnowledgeGraphCanvas
      entities={entities}
      connections={connections}
      selectedEntityId={selectedEntityId}
      onSelectEntity={onSelectEntity}
      compact={compact}
      minHeight={minHeight}
    />
  );
};
