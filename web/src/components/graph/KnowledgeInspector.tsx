import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import HubOutlinedIcon from '@mui/icons-material/HubOutlined';
import {
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { KnowledgeGraphEntity } from '../../data/types';
import { knowledgeEntityConfig } from './graphConfig';

interface KnowledgeInspectorProps {
  entity: KnowledgeGraphEntity | null;
  totalEntities: number;
  totalConnections: number;
  onClose: () => void;
}

export const KnowledgeInspector = ({
  entity,
  totalEntities,
  totalConnections,
  onClose,
}: KnowledgeInspectorProps) => {
  if (!entity) {
    return (
      <Paper
        sx={{
          height: '100%',
          minHeight: 260,
          p: 2.5,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1.5,
        }}
      >
        <HubOutlinedIcon color="primary" />
        <Typography fontWeight={800} sx={{ mt: 2 }}>
          Сведения о графе
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Выберите узел, чтобы увидеть его свойства, связи и источники.
        </Typography>
        <Stack direction="row" spacing={3} sx={{ mt: 3 }}>
          <Box>
            <Typography variant="h5" fontWeight={800}>
              {totalEntities}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              сущностей
            </Typography>
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800}>
              {totalConnections}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              связей
            </Typography>
          </Box>
        </Stack>
      </Paper>
    );
  }

  const config = knowledgeEntityConfig[entity.type];
  const entityPath =
    entity.type === 'material'
      ? `/materials/${entity.id}`
      : entity.type === 'experiment'
        ? `/experiments/${entity.id}`
        : entity.type === 'document'
          ? `/documents/${entity.id}`
          : null;

  return (
    <Paper
      sx={{
        height: '100%',
        minHeight: 400,
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1.5,
        overflow: 'hidden',
      }}
    >
      <Box sx={{ p: 2.5 }}>
        <Stack direction="row" alignItems="flex-start" spacing={1}>
          <Box minWidth={0} flex={1}>
            <Chip
              size="small"
              label={config.label}
              sx={{
                mb: 1.5,
                color: config.color,
                border: '1px solid',
                borderColor: `${config.color}66`,
                backgroundColor: `${config.color}12`,
              }}
            />
            <Typography variant="h6" fontWeight={800}>
              {entity.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {entity.subtitle}
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose} aria-label="Закрыть">
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
        <Typography variant="body2" lineHeight={1.7} sx={{ mt: 2.5 }}>
          {entity.description}
        </Typography>
      </Box>

      <Divider />

      <Box sx={{ p: 2.5 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          fontWeight={700}
          textTransform="uppercase"
          letterSpacing=".08em"
        >
          Свойства
        </Typography>
        <Stack spacing={1.5} sx={{ mt: 1.5 }}>
          {entity.properties.map((property) => (
            <Stack
              key={property.label}
              direction="row"
              justifyContent="space-between"
              spacing={2}
            >
              <Typography variant="body2" color="text.secondary">
                {property.label}
              </Typography>
              <Typography variant="body2" fontWeight={700} textAlign="right">
                {property.value}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Box>

      <Box sx={{ mt: 'auto', p: 2.5, pt: 0 }}>
        {entityPath && (
          <Button
            component={Link}
            to={entityPath}
            fullWidth
            variant="outlined"
            startIcon={<ArticleOutlinedIcon />}
          >
            Открыть карточку
          </Button>
        )}
      </Box>
    </Paper>
  );
};
