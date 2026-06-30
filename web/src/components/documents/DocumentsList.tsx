import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import {
  Box,
  Chip,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import { DocumentRecord } from '../../data/types';
import { documentStatusConfig } from './documentConfig';

interface DocumentsListProps {
  documents: DocumentRecord[];
  selectedId: string | null;
  onSelect: (document: DocumentRecord) => void;
}

export const DocumentsList = ({
  documents,
  selectedId,
  onSelect,
}: DocumentsListProps) => (
  <Paper sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden' }}>
    <Box sx={{ px: 2.5, py: 1.75, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Typography fontWeight={800}>Документы</Typography>
      <Typography variant="caption" color="text.secondary">
        Найдено: {documents.length}
      </Typography>
    </Box>
    <List disablePadding>
      {documents.map((document) => {
        const status = documentStatusConfig[document.status];

        return (
          <ListItemButton
            key={document.id}
            selected={selectedId === document.id}
            onClick={() => onSelect(document)}
            sx={{
              minHeight: 74,
              px: 2.5,
              borderBottom: '1px solid',
              borderColor: 'divider',
              '&:last-child': { borderBottom: 0 },
              '&.Mui-selected': { backgroundColor: 'rgba(79,209,197,.08)' },
            }}
          >
            <ListItemIcon sx={{ minWidth: 38, color: 'primary.main' }}>
              <ArticleOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={document.title}
              secondary={`${document.type.toUpperCase()} · ${document.year} · ${document.author}`}
              slotProps={{
                primary: { noWrap: true, fontWeight: 800 },
                secondary: { noWrap: true },
              }}
            />
            <Chip
              size="small"
              label={status.label}
              color={status.color}
              variant="outlined"
              sx={{ display: { xs: 'none', xl: 'flex' }, mr: 1 }}
            />
            <ChevronRightRoundedIcon color="disabled" />
          </ListItemButton>
        );
      })}
    </List>
  </Paper>
);
