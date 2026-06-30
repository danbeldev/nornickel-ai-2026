import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import {
  Box,
  Button,
  Chip,
  Divider,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { DocumentRecord } from '../../data/types';
import { documentStatusConfig } from '../documents/documentConfig';

interface DataSourcesPanelProps {
  documents: DocumentRecord[];
}

export const DataSourcesPanel = ({ documents }: DataSourcesPanelProps) => (
  <Paper
    component="section"
    sx={{
      height: '100%',
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 1.5,
      overflow: 'hidden',
    }}
  >
    <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Typography fontWeight={800}>Источники данных</Typography>
      <Typography variant="caption" color="text.secondary">
        Последние добавленные документы
      </Typography>
    </Box>
    <Box>
      {documents.map((document, index) => {
        const status = documentStatusConfig[document.status];

        return (
          <Box key={document.id}>
            <ListItemButton
              component={Link}
              to={`/documents/${document.id}`}
              sx={{ minHeight: 64, px: 2.5 }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: 'primary.main' }}>
                <ArticleOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={document.title}
                secondary={`${document.type.toUpperCase()} · ${document.year} · ${document.author}`}
                slotProps={{
                  primary: { noWrap: true, fontSize: 14, fontWeight: 700 },
                  secondary: { noWrap: true, fontSize: 12 },
                }}
              />
              <Chip
                size="small"
                label={status.label}
                color={status.color}
                variant="outlined"
                sx={{ ml: 1, display: { xs: 'none', sm: 'flex' } }}
              />
            </ListItemButton>
            {index < documents.length - 1 && <Divider />}
          </Box>
        );
      })}
    </Box>
    <Button
      component={Link}
      to="/documents"
      fullWidth
      endIcon={<ArrowForwardRoundedIcon />}
      sx={{
        justifyContent: 'space-between',
        px: 2.5,
        py: 1.5,
        borderTop: '1px solid',
        borderColor: 'divider',
        borderRadius: 0,
      }}
    >
      Открыть все документы
    </Button>
  </Paper>
);
