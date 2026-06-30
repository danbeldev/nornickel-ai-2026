import AddCommentRoundedIcon from '@mui/icons-material/AddCommentRounded';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import BiotechOutlinedIcon from '@mui/icons-material/BiotechOutlined';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import DeviceHubRoundedIcon from '@mui/icons-material/DeviceHubRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import {
  Box,
  Button,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../../data/api';
import { ChatHistoryGroup, ChatSummary } from '../../data/types';

export const SIDEBAR_WIDTH = 264;

const navigation = [
  { label: 'Обзор', icon: DashboardRoundedIcon, path: '/' },
  {
    label: 'Граф знаний',
    icon: DeviceHubRoundedIcon,
    path: '/knowledge-graph',
  },
  {
    label: 'Экспериментальные данные',
    icon: BiotechOutlinedIcon,
    path: '/experiments',
  },
  { label: 'Материалы', icon: Inventory2OutlinedIcon, path: '/materials' },
  { label: 'Документы', icon: ArticleOutlinedIcon, path: '/documents' },
  {
    label: 'Проблемы в данных',
    icon: ErrorOutlineRoundedIcon,
    path: '/data-issues',
  },
];

const chatGroupLabels: Record<ChatHistoryGroup, string> = {
  today: 'Сегодня',
  yesterday: 'Вчера',
  earlier: 'Ранее',
};

const chatGroupOrder: ChatHistoryGroup[] = [
  'today',
  'yesterday',
  'earlier',
];

interface AppSidebarProps {
  desktopOpen: boolean;
  mobileOpen: boolean;
  onClose: () => void;
}

interface SidebarContentProps {
  onNavigate: () => void;
}

const SidebarContent = ({ onNavigate }: SidebarContentProps) => {
  const { pathname } = useLocation();
  const [chats, setChats] = useState<ChatSummary[]>([]);

  useEffect(() => {
    api.getChats().then(setChats);
  }, []);

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        px: 1.5,
        pt: 2,
        pb: 2,
        overflow: 'hidden',
      }}
    >
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ px: 1.5, mb: 0.75, letterSpacing: '.12em' }}
      >
        База знаний
      </Typography>
      <List disablePadding>
        {navigation.map(({ label, icon: Icon, path }) => {
          const active = path
            ? pathname === path ||
              (path !== '/' && pathname.startsWith(`${path}/`))
            : false;
          const destination = path ?? '#';

          return (
            <ListItemButton
              key={label}
              component={Link}
              to={destination}
              selected={active}
              onClick={onNavigate}
              sx={{
                minHeight: 39,
                mb: 0.25,
                borderRadius: 1,
                color: active ? 'primary.light' : 'text.secondary',
                '&.Mui-selected': {
                  backgroundColor: 'rgba(79,209,197,.11)',
                  '&:hover': { backgroundColor: 'rgba(79,209,197,.15)' },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 34, color: 'inherit' }}>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={label}
                slotProps={{
                  primary: {
                    fontSize: 13.5,
                    fontWeight: active ? 700 : 500,
                  },
                }}
              />
            </ListItemButton>
          );
        })}
      </List>

      <Divider sx={{ my: 1.5 }} />

      <Box
        sx={{
          minHeight: 0,
          display: 'flex',
          flex: 1,
          flexDirection: 'column',
        }}
      >
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ px: 1.5, mb: 0.75, letterSpacing: '.12em' }}
        >
          Чаты
        </Typography>
        <Button
          component={Link}
          to="/chat/new"
          variant="contained"
          fullWidth
          startIcon={<AddCommentRoundedIcon />}
          onClick={onNavigate}
          sx={{
            minHeight: 40,
            flexShrink: 0,
            justifyContent: 'flex-start',
            px: 1.5,
          }}
        >
          Новый чат
        </Button>

        <Box
          sx={{
            minHeight: 0,
            flex: 1,
            mt: 1.25,
            pr: 0.25,
            overflowY: 'auto',
          }}
        >
          {chatGroupOrder.map((group) => {
            const groupChats = chats.filter((chat) => chat.group === group);

            if (groupChats.length === 0) return null;

            return (
              <Box key={group} sx={{ mb: 1.25 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', px: 1.5, py: 0.5 }}
                >
                  {chatGroupLabels[group]}
                </Typography>
                <List disablePadding>
                  {groupChats.map((chat) => {
                    const path = `/chat/${chat.id}`;
                    const active = pathname === path;

                    return (
                      <ListItemButton
                        key={chat.id}
                        component={Link}
                        to={path}
                        selected={active}
                        onClick={onNavigate}
                        sx={{
                          minHeight: 36,
                          px: 1.25,
                          borderRadius: 1,
                          color: active ? 'text.primary' : 'text.secondary',
                          '&.Mui-selected': {
                            backgroundColor: 'rgba(79,209,197,.1)',
                          },
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 30, color: 'inherit' }}>
                          <ChatBubbleOutlineRoundedIcon
                            sx={{ fontSize: 17 }}
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={chat.title}
                          slotProps={{
                            primary: {
                              noWrap: true,
                              fontSize: 13,
                              fontWeight: active ? 700 : 500,
                            },
                          }}
                        />
                      </ListItemButton>
                    );
                  })}
                </List>
              </Box>
            );
          })}
        </Box>
      </Box>

      <Box sx={{ flexShrink: 0, pt: 1 }}>
        <Divider sx={{ mb: 1 }} />
        <ListItemButton
          sx={{ minHeight: 40, borderRadius: 1, color: 'text.secondary' }}
        >
          <ListItemIcon sx={{ minWidth: 34, color: 'inherit' }}>
            <SettingsOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Настройки"
            slotProps={{ primary: { fontSize: 13.5, fontWeight: 500 } }}
          />
        </ListItemButton>
      </Box>
    </Box>
  );
};

export const AppSidebar = ({
  desktopOpen,
  mobileOpen,
  onClose,
}: AppSidebarProps) => (
  <Box component="nav" aria-label="Основная навигация">
    <Drawer
      variant="temporary"
      open={mobileOpen}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      sx={{
        display: { xs: 'block', md: 'none' },
        '& .MuiDrawer-paper': {
          width: SIDEBAR_WIDTH,
          mt: '72px',
          height: 'calc(100% - 72px)',
          backgroundColor: '#0C131B',
        },
      }}
    >
      <SidebarContent onNavigate={onClose} />
    </Drawer>
    <Drawer
      variant="persistent"
      open={desktopOpen}
      sx={{
        display: { xs: 'none', md: 'block' },
        width: desktopOpen ? SIDEBAR_WIDTH : 0,
        flexShrink: 0,
        transition: (theme) =>
          theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        '& .MuiDrawer-paper': {
          width: SIDEBAR_WIDTH,
          mt: '72px',
          height: 'calc(100% - 72px)',
          borderRight: '1px solid',
          borderColor: 'divider',
          backgroundColor: '#0C131B',
        },
      }}
    >
      <SidebarContent onNavigate={onClose} />
    </Drawer>
  </Box>
);
