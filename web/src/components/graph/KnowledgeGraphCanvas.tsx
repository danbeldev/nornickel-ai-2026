import { Paper } from '@mui/material';
import {
  Background,
  BackgroundVariant,
  Controls,
  Edge,
  MarkerType,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import { useEffect, useMemo } from 'react';
import {
  KnowledgeGraphConnection,
  KnowledgeGraphEntity,
} from '../../data/types';
import { knowledgeEntityConfig } from './graphConfig';
import {
  KnowledgeFlowNode,
  KnowledgeNodeCard,
} from './KnowledgeNodeCard';

const nodeTypes = {
  knowledgeEntity: KnowledgeNodeCard,
};

interface KnowledgeGraphCanvasProps {
  entities: KnowledgeGraphEntity[];
  connections: KnowledgeGraphConnection[];
  onSelectEntity: (entity: KnowledgeGraphEntity | null) => void;
  selectedEntityId?: string | null;
  compact?: boolean;
}

const createNodes = (
  entities: KnowledgeGraphEntity[],
  selectedEntityId?: string | null,
): KnowledgeFlowNode[] =>
  entities.map((entity) => ({
    id: entity.id,
    type: 'knowledgeEntity',
    position: entity.position,
    data: { entity },
    selected: entity.id === selectedEntityId,
  }));

const createEdges = (
  connections: KnowledgeGraphConnection[],
): Edge[] =>
  connections.map((connection) => ({
    id: connection.id,
    source: connection.source,
    target: connection.target,
    label: connection.label,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: '#536978',
      width: 16,
      height: 16,
    },
    style: {
      stroke: '#536978',
      strokeWidth: 1.25,
    },
    labelStyle: {
      fill: '#8FA4B5',
      fontSize: 10,
      fontWeight: 600,
    },
    labelBgStyle: {
      fill: '#0A1118',
      fillOpacity: 0.9,
    },
    labelBgPadding: [5, 3] as [number, number],
    labelBgBorderRadius: 3,
  }));

export const KnowledgeGraphCanvas = ({
  entities,
  connections,
  onSelectEntity,
  selectedEntityId = null,
  compact = false,
}: KnowledgeGraphCanvasProps) => {
  const preparedNodes = useMemo(
    () => createNodes(entities, selectedEntityId),
    [entities, selectedEntityId],
  );
  const preparedEdges = useMemo(
    () => createEdges(connections),
    [connections],
  );
  const [nodes, setNodes, onNodesChange] =
    useNodesState<KnowledgeFlowNode>(preparedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(preparedEdges);

  useEffect(() => {
    setNodes(preparedNodes);
    setEdges(preparedEdges);
  }, [preparedEdges, preparedNodes, setEdges, setNodes]);

  return (
    <Paper
      sx={{
        height: '100%',
        minHeight: compact ? 330 : 600,
        overflow: 'hidden',
        border: compact ? 0 : '1px solid',
        borderColor: 'divider',
        borderRadius: compact ? 0 : 1.5,
        backgroundColor: '#0A1118',
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) => onSelectEntity(node.data.entity)}
        onPaneClick={() => onSelectEntity(null)}
        nodesConnectable={false}
        deleteKeyCode={null}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.35}
        maxZoom={1.8}
        colorMode="dark"
      >
        <Background
          variant={BackgroundVariant.Dots}
          color="#2B3A45"
          gap={22}
          size={1}
        />
        {!compact && (
          <>
            <MiniMap
              pannable
              zoomable
              nodeColor={(node) => {
                const entity = (node as KnowledgeFlowNode).data.entity;
                return knowledgeEntityConfig[entity.type].color;
              }}
              maskColor="rgba(8, 13, 19, .76)"
              style={{
                border: '1px solid #22303D',
                backgroundColor: '#0D151D',
              }}
            />
            <Controls
              showInteractive={false}
              style={{
                border: '1px solid #22303D',
                boxShadow: 'none',
              }}
            />
          </>
        )}
      </ReactFlow>
    </Paper>
  );
};
