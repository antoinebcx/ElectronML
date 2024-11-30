import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box } from '@mui/material';
import { TrainingForm } from './components/TrainingForm';
import { ModelTester } from './components/ModelTester';
import { useState } from 'react';
import { TrainingResult } from './services/api';

const theme = createTheme({
  palette: {
    mode: 'dark'
  }
});

export default function App() {
  const [trainingResult, setTrainingResult] = useState<TrainingResult | null>(null);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
        <TrainingForm onTrainingComplete={setTrainingResult} />
        {trainingResult && (
          <ModelTester 
            modelData={trainingResult.artifacts.model.data}
            featureNames={trainingResult.feature_names}
            // These would come from your training result
            categoricalFeatures={trainingResult.artifacts.categorical_features}
            classMapping={trainingResult.artifacts.class_mapping}
          />
        )}
      </Box>
    </ThemeProvider>
  );
}