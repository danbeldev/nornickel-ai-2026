import HubRoundedIcon from '@mui/icons-material/HubRounded';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import {
  AppBar,
  Avatar,
  Box,
  IconButton,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import { Link } from 'react-router-dom';

interface AppHeaderProps {
  onMenuClick: () => void;
}

export const AppHeader = ({ onMenuClick }: AppHeaderProps) => (
  <AppBar
    position="fixed"
    color="default"
    elevation={0}
    sx={{
      borderBottom: '1px solid',
      borderColor: 'divider',
      backgroundColor: 'rgba(8, 13, 19, 0.9)',
      backdropFilter: 'blur(16px)',
      zIndex: (theme) => theme.zIndex.drawer + 1,
    }}
  >
    <Toolbar sx={{ minHeight: '72px !important', px: { xs: 2, md: 3 } }}>
      <IconButton
        color="inherit"
        aria-label="Открыть или скрыть навигацию"
        onClick={onMenuClick}
        sx={{ mr: 1 }}
      >
        <MenuRoundedIcon />
      </IconButton>
      <Box sx={{ width: { md: 232 }, flexShrink: 0 }}>
        <Stack
          component={Link}
          to="/"
          direction="row"
          alignItems="center"
          spacing={1.25}
          sx={{ color: 'text.primary' }}
        >
          <Box
            sx={{
              width: 38,
              height: 38,
              display: 'grid',
              placeItems: 'center',
              borderRadius: 1,
              color: 'primary.contrastText',
              backgroundColor: 'primary.main',
            }}
          >
            <HubRoundedIcon />
          </Box>
          <Box>
            <Typography fontWeight={800} lineHeight={1.05}>
              Научный клубок
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: { xs: 'none', lg: 'block' } }}
            >
              Рабочее пространство
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Stack
        direction="row"
        alignItems="center"
        spacing={0.5}
        sx={{ ml: 'auto' }}
      >
        <Box
          sx={{
            display: { xs: 'none', sm: 'flex' },
            alignItems: 'center',
            gap: 1,
            mr: 1.5,
            px: 1.5,
            py: 0.75,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            backgroundColor: 'rgba(255,255,255,0.025)',
          }}
        >
          <Box
            sx={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              backgroundColor: '#59D499',
              boxShadow: '0 0 10px rgba(89,212,153,.7)',
            }}
          />
          <Typography variant="caption" color="text.secondary">
            База актуальна
          </Typography>
        </Box>
        <IconButton color="inherit" aria-label="Помощь">
          <HelpOutlineRoundedIcon />
        </IconButton>
        <IconButton color="inherit" aria-label="Уведомления">
          <NotificationsNoneRoundedIcon />
        </IconButton>
        <Avatar
          sx={{
            width: 34,
            height: 34,
            ml: 1,
            fontSize: 13,
            fontWeight: 800,
            color: 'primary.light',
            backgroundColor: 'rgba(79,209,197,.14)',
          }}
        >
          ДБ
        </Avatar>
      </Stack>
    </Toolbar>
  </AppBar>
);
