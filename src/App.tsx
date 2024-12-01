import React, { useState, useEffect, useMemo } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, useMediaQuery } from '@mui/material';
import { TrainingForm } from './components/TrainingForm';
import { ModelTester } from './components/ModelTester';
import { TrainingResult, TaskType } from './services/api';
import { createAppTheme } from './theme';
import NavBar from './components/NavBar';

export default function App() {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [mode, setMode] = useState<'light' | 'dark'>(prefersDarkMode ? 'dark' : 'light');
  
  const [trainingResult, setTrainingResult] = useState<TrainingResult | null>(null);
  const [taskType, setTaskType] = useState<TaskType>('binary_classification');

  useEffect(() => {
    setMode(prefersDarkMode ? 'dark' : 'light');
  }, [prefersDarkMode]);

  const theme = useMemo(() => createAppTheme(mode), [mode]);

  const handleTrainingComplete = (result: TrainingResult, type: TaskType) => {
    setTrainingResult(result);
    setTaskType(type);
  };

  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ 
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <NavBar onToggleTheme={toggleTheme} />
        
        <Box sx={{ 
          flex: 1,
          py: 2,
          px: { xs: 2, sm: 3 }
        }}>
          <Box sx={{
            maxWidth: 1000,
            mx: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <TrainingForm
              onTrainingComplete={handleTrainingComplete}
            />
            {trainingResult && (
              <ModelTester
                modelData={trainingResult.artifacts.model.data}
                preprocessingMetadata={trainingResult.artifacts.preprocessing_metadata}
                featureNames={trainingResult.feature_names}
                classMapping={trainingResult.class_mapping}
                isRegression={taskType === 'regression'}
                onError={(error) => console.error(error)}
              />
            )}
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}