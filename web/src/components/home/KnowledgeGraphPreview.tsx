import OpenInFullRoundedIcon from '@mui/icons-material/OpenInFullRounded';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { KnowledgeGraphData } from '../../data/types';
import { KnowledgeGraphCanvas } from '../graph/KnowledgeGraphCanvas';

interface KnowledgeGraphPreviewProps {
  data: KnowledgeGraphData;
}

export const KnowledgeGraphPreview = ({
  data,
}: KnowledgeGraphPreviewProps) => (
  <Paper
    component="section"
    sx={{
      height: '100%',
      minHeight: 430,
      display: 'flex',
      flexDirection: 'column',
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 1.5,
      overflow: 'hidden',
    }}
  >
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      spacing={2}
      sx={{
        px: 2.5,
        py: 1.75,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box>
        <Typography fontWeight={800}>Граф знаний</Typography>
        <Typography variant="caption" color="text.secondary">
          Фрагмент актуальной базы знаний
        </Typography>
      </Box>
      <Button
        component={Link}
        to="/knowledge-graph"
        size="small"
        variant="outlined"
        endIcon={<OpenInFullRoundedIcon />}
      >
        Открыть граф
      </Button>
    </Stack>

    <Box sx={{ flex: 1, minHeight: 350 }}>
      <KnowledgeGraphCanvas
        entities={data.entities}
        connections={data.connections}
        onSelectEntity={() => undefined}
        compact
      />
    </Box>
  </Paper>
);
