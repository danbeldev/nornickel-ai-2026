import DeviceHubRoundedIcon from '@mui/icons-material/DeviceHubRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChatEvidence,
  KnowledgeGraphEntity,
} from '../../data/types';
import { getEntityPath } from '../../utils/entityRoutes';
import { EvidenceGraph } from './EvidenceGraph';

interface AnswerGraphDialogProps {
  open: boolean;
  evidence: ChatEvidence;
  onClose: () => void;
}

export const AnswerGraphDialog = ({
  open,
  evidence,
  onClose,
}: AnswerGraphDialogProps) => {
  const [selectedEntity, setSelectedEntity] =
    useState<KnowledgeGraphEntity | null>(null);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1.25}>
          <DeviceHubRoundedIcon color="primary" />
          <Box flex={1}>
            <Typography fontWeight={800}>Граф контекста ответа</Typography>
            <Typography variant="caption" color="text.secondary">
              Сущности и связи, переданные языковой модели
            </Typography>
          </Box>
          <Chip size="small" label={`${evidence.entities.length} сущностей`} />
          <Chip size="small" label={`${evidence.paths.length} связей`} />
          {selectedEntity && (
            <Button
              component={Link}
              to={getEntityPath(selectedEntity.type, selectedEntity.id)}
              variant="outlined"
              size="small"
              endIcon={<OpenInNewRoundedIcon />}
              onClick={onClose}
            >
              Открыть карточку
            </Button>
          )}
          <IconButton onClick={onClose} aria-label="Закрыть">
            <CloseRoundedIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ pb: 2.5 }}>
        <EvidenceGraph
          evidence={evidence}
          compact={false}
          minHeight={560}
          selectedEntityId={selectedEntity?.id}
          onSelectEntity={setSelectedEntity}
        />
        {selectedEntity && (
          <Box
            sx={{
              mt: 1.5,
              p: 1.5,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
            }}
          >
            <Typography fontWeight={800}>{selectedEntity.title}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {selectedEntity.description}
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};
