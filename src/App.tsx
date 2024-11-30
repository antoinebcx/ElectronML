import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { TrainingForm } from './components/TrainingForm';

const theme = createTheme({
  palette: {
    mode: 'dark'
  }
});

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <TrainingForm />
    </ThemeProvider>
  );
}