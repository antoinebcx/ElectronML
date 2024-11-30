import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box } from '@mui/material';
import { TrainingForm } from './components/TrainingForm';
import { ModelTester } from './components/ModelTester';
import { useState } from 'react';
import { TrainingResult, TaskType } from './services/api';
import { createAppTheme } from './theme';

export default function App() {
  const [trainingResult, setTrainingResult] = useState<TrainingResult | null>(null);
  const [taskType, setTaskType] = useState<TaskType>('binary_classification');
  
  const theme = createAppTheme('dark');

  const handleTrainingComplete = (result: TrainingResult, type: TaskType) => {
    setTrainingResult(result);
    setTaskType(type);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box 
        sx={{ 
          minHeight: '100vh',
          bgcolor: 'background.default',
          py: 4,
          px: { xs: 2, sm: 3 }
        }}
      >
        <Box 
          sx={{ 
            maxWidth: 1000, 
            mx: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 3
          }}
        >
          <TrainingForm
            onTrainingComplete={(result, type) => handleTrainingComplete(result, type)}
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
    </ThemeProvider>
  );
}