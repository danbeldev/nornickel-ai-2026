import { CssBaseline, ThemeProvider } from '@mui/material';
import { BrowserRouter } from 'react-router-dom';
import { AppRouter } from './app/AppRouter';
import { appTheme } from './app/theme';

function App() {
  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
