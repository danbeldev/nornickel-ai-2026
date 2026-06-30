import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import BiotechOutlinedIcon from '@mui/icons-material/BiotechOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import Groups2OutlinedIcon from '@mui/icons-material/Groups2Outlined';
import HexagonOutlinedIcon from '@mui/icons-material/HexagonOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import PrecisionManufacturingOutlinedIcon from '@mui/icons-material/PrecisionManufacturingOutlined';
import ThermostatOutlinedIcon from '@mui/icons-material/ThermostatOutlined';
import { Box, Stack, Typography } from '@mui/material';
import { Handle, Node, NodeProps, Position } from '@xyflow/react';
import {
  KnowledgeEntityType,
  KnowledgeGraphEntity,
} from '../../data/types';
import { knowledgeEntityConfig } from './graphConfig';

type KnowledgeNodeData = {
  entity: KnowledgeGraphEntity;
};

export type KnowledgeFlowNode = Node<
  KnowledgeNodeData,
  'knowledgeEntity'
>;

const icons: Record<KnowledgeEntityType, typeof HexagonOutlinedIcon> = {
  material: HexagonOutlinedIcon,
  experiment: BiotechOutlinedIcon,
  property: InsightsOutlinedIcon,
  regime: ThermostatOutlinedIcon,
  equipment: PrecisionManufacturingOutlinedIcon,
  document: ArticleOutlinedIcon,
  team: Groups2OutlinedIcon,
  conclusion: FactCheckOutlinedIcon,
};

const handleStyles = {
  width: 7,
  height: 7,
  border: '1px solid #4B6070',
  backgroundColor: '#101820',
};

export const KnowledgeNodeCard = ({
  data,
  selected,
}: NodeProps<KnowledgeFlowNode>) => {
  const { entity } = data;
  const config = knowledgeEntityConfig[entity.type];
  const Icon = icons[entity.type];

  return (
    <Box
      sx={{
        width: 190,
        px: 1.5,
        py: 1.25,
        border: '1px solid',
        borderColor: selected ? config.color : '#2B3B47',
        borderRadius: 1.5,
        backgroundColor: '#111B24',
        boxShadow: selected
          ? `0 0 0 2px ${config.color}2B, 0 12px 30px rgba(0,0,0,.28)`
          : '0 10px 24px rgba(0,0,0,.2)',
        transition: 'border-color 150ms ease, box-shadow 150ms ease',
      }}
    >
      <Handle type="target" position={Position.Left} style={handleStyles} />
      <Stack direction="row" alignItems="center" spacing={1.1}>
        <Box
          sx={{
            width: 30,
            height: 30,
            display: 'grid',
            flexShrink: 0,
            placeItems: 'center',
            color: config.color,
            borderRadius: 1,
            backgroundColor: `${config.color}18`,
          }}
        >
          <Icon sx={{ fontSize: 17 }} />
        </Box>
        <Box minWidth={0}>
          <Typography
            variant="body2"
            fontWeight={800}
            noWrap
            title={entity.title}
          >
            {entity.title}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            noWrap
            sx={{ display: 'block' }}
            title={entity.subtitle}
          >
            {entity.subtitle}
          </Typography>
        </Box>
      </Stack>
      <Handle type="source" position={Position.Right} style={handleStyles} />
    </Box>
  );
};
