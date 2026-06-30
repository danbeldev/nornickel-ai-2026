import { Box, useMediaQuery, useTheme } from '@mui/material';
import { ReactNode, useState } from 'react';
import { AppHeader } from './AppHeader';
import { AppSidebar, SIDEBAR_WIDTH } from './AppSidebar';

interface WorkspaceLayoutProps {
  children: ReactNode;
}

export const WorkspaceLayout = ({ children }: WorkspaceLayoutProps) => {
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const [desktopNavOpen, setDesktopNavOpen] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleMenuClick = () => {
    if (desktop) {
      setDesktopNavOpen((open) => !open);
      return;
    }

    setMobileNavOpen(true);
  };

  return (
    <Box minHeight="100vh">
      <AppHeader onMenuClick={handleMenuClick} />
      <AppSidebar
        desktopOpen={desktopNavOpen}
        mobileOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />
      <Box
        component="main"
        sx={{
          ml: {
            md: desktopNavOpen ? `${SIDEBAR_WIDTH}px` : 0,
          },
          pt: '72px',
          minHeight: '100vh',
          transition: (currentTheme) =>
            currentTheme.transitions.create('margin-left', {
              easing: currentTheme.transitions.easing.sharp,
              duration: desktopNavOpen
                ? currentTheme.transitions.duration.enteringScreen
                : currentTheme.transitions.duration.leavingScreen,
            }),
        }}
      >
        {children}
      </Box>
    </Box>
  );
};
