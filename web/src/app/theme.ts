import { createTheme } from '@mui/material/styles';

export const appTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#4FD1C5',
      dark: '#2EA99F',
      light: '#8AE4DC',
      contrastText: '#07110F',
    },
    secondary: {
      main: '#F2B95D',
      dark: '#C88C31',
      light: '#F8D99D',
    },
    background: {
      default: '#080D13',
      paper: '#101820',
    },
    text: {
      primary: '#EEF5F7',
      secondary: '#8FA4B5',
    },
    divider: '#22303D',
  },
  shape: {
    borderRadius: 6,
  },
  typography: {
    fontFamily:
      '"Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    h1: {
      fontSize: 'clamp(2rem, 4vw, 3rem)',
      fontWeight: 700,
      lineHeight: 1.1,
      letterSpacing: '-0.04em',
    },
    h2: {
      fontSize: 'clamp(1.9rem, 3vw, 2.75rem)',
      fontWeight: 700,
      lineHeight: 1.12,
      letterSpacing: '-0.035em',
    },
    h3: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    button: {
      fontWeight: 700,
      textTransform: 'none',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          boxShadow: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid #22303D',
          boxShadow: '0 18px 48px rgba(0, 0, 0, 0.2)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 6,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});
