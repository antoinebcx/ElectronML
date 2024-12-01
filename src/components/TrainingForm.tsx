import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  TextField, 
  Card, 
  Typography, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel 
} from '@mui/material';
import { mlApi, TrainingResult, TaskType, XGBoostConfig } from '../services/api';
import ConfusionMatrix from './ConfusionMatrix';
import RegressionPlot from './RegressionPlot'
import { FileUpload } from './FileUpload';

interface TrainingFormProps {
  onTrainingComplete?: (result: TrainingResult, taskType: TaskType) => void;
}

export const TrainingForm = ({ onTrainingComplete }: TrainingFormProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [targetColumn, setTargetColumn] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('binary_classification');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrainingResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !targetColumn) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    const config: XGBoostConfig = {
      target_column: targetColumn,
      task_type: taskType,
      parameters: {
        max_depth: 3,
        learning_rate: 0.1,
        n_estimators: 100
      }
    };

    try {
      const result = await mlApi.trainModel(formData, config);
      setResult(result);
      onTrainingComplete?.(result, taskType);
    } catch (error) {
      console.error('Training failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadModel = () => {
    if (!result?.artifacts.model.data) return;
    
    const blob = new Blob(
      [atob(result.artifacts.model.data)], 
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'model.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ p: 3 }}>
      <form onSubmit={handleSubmit}>
        <Card sx={{ p: 3, mb: 2 }}>
          <Typography variant="h6" gutterBottom>Train model</Typography>
          
          <Box sx={{ mb: 2 }}>
          <FileUpload
            onFileChange={setFile}
            currentFile={file}
          />
          </Box>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Task Type</InputLabel>
            <Select
              value={taskType}
              onChange={(e) => setTaskType(e.target.value as TaskType)}
              label="Task Type"
            >
              <MenuItem value="binary_classification">Binary Classification</MenuItem>
              <MenuItem value="multiclass_classification">Multiclass Classification</MenuItem>
              <MenuItem value="regression">Regression</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Target Column"
            value={targetColumn}
            onChange={(e) => setTargetColumn(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />

          <Button
            type="submit"
            variant="contained"
            disabled={loading || !file || !targetColumn}
          >
            {loading ? 'Training...' : 'Train Model'}
          </Button>
        </Card>
      </form>
          
      {result && (
        <Card sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>Results</Typography>
          
          {taskType.includes('classification') ? (
            <>
              <Typography>
                Train Accuracy: {(result.metrics.train_accuracy! * 100).toFixed(2)}%
              </Typography>
              <Typography>
                Test Accuracy: {(result.metrics.test_accuracy! * 100).toFixed(2)}%
              </Typography>
              
              {/* Confusion Matrix */}
              {result.metrics.confusion_matrix && (
                <ConfusionMatrix 
                  matrix={result.metrics.confusion_matrix}
                  classMapping={result.class_mapping}
                />
              )}
            </>
          ) : (
            <>
              <Typography>
                Train RMSE: {result.metrics.train_rmse?.toFixed(4)}
              </Typography>
              <Typography>
                Test RMSE: {result.metrics.test_rmse?.toFixed(4)}
              </Typography>

              {/* Regression Plot */}
              {result.metrics.test_predictions && (
                <RegressionPlot
                  actual={result.metrics.test_predictions.actual}
                  predicted={result.metrics.test_predictions.predicted}
                />
              )}
            </>
          )}
          
          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
            Feature Importance
          </Typography>
          {result.feature_names.map((name, i) => (
            <Typography key={name}>
              {name}: {result.feature_importance[i].toFixed(4)}
            </Typography>
          ))}

          <Box sx={{ mt: 2 }}>
            <Button 
              variant="contained" 
              onClick={downloadModel}
            >
              Download Model
            </Button>
          </Box>
        </Card>
      )}
    </Box>
  );
};