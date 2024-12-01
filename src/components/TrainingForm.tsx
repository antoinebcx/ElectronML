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
  InputLabel,
  IconButton,
  Collapse,
  Grid,
  Divider
} from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import { mlApi, TrainingResult, TaskType, XGBoostConfig } from '../services/api';
import ConfusionMatrix from './ConfusionMatrix';
import RegressionPlot from './RegressionPlot'
import { FileUpload } from './FileUpload';

interface TrainingFormProps {
  onTrainingComplete?: (result: TrainingResult, taskType: TaskType) => void;
}

interface TrainingParameters {
  n_estimators: number;
  max_depth: number;
  learning_rate: number;
}

export const TrainingForm = ({ onTrainingComplete }: TrainingFormProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [targetColumn, setTargetColumn] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('binary_classification');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrainingResult | null>(null);
  const [showParams, setShowParams] = useState(false);
  const [parameters, setParameters] = useState<TrainingParameters>({
    n_estimators: 100,
    max_depth: 3,
    learning_rate: 0.1
  });

  const handleParameterChange = (param: keyof TrainingParameters) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = Number(event.target.value);
    setParameters(prev => ({
      ...prev,
      [param]: value
    }));
  };

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
        max_depth: parameters.max_depth,
        learning_rate: parameters.learning_rate,
        n_estimators: parameters.n_estimators
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
    const blob = new Blob([atob(result.artifacts.model.data)], { type: 'application/json' });
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
        <Card sx={{ p: 3, mb: 3 }} elevation={0}>
          <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>Train a model</Typography>
          
          <Box sx={{ mb: 3 }}>
            <FileUpload
              onFileChange={setFile}
              currentFile={file}
            />
          </Box>

          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Task type</InputLabel>
            <Select
              value={taskType}
              onChange={(e) => setTaskType(e.target.value as TaskType)}
              label="Task type"
            >
              <MenuItem value="binary_classification">Binary classification</MenuItem>
              <MenuItem value="multiclass_classification">Multiclass classification</MenuItem>
              <MenuItem value="regression">Regression</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Target column"
            value={targetColumn}
            onChange={(e) => setTargetColumn(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />

          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              cursor: 'pointer',
              mb: 2 
            }}
            onClick={() => setShowParams(!showParams)}
          >
            <Typography variant="subtitle1" sx={{ color: 'text.secondary' }}>
              Training parameters
            </Typography>
            <IconButton size="small">
              {showParams ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>

          <Collapse in={showParams}>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Number of Trees"
                  value={parameters.n_estimators}
                  onChange={handleParameterChange('n_estimators')}
                  inputProps={{ min: 1, max: 1000, step: 1 }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Max Depth"
                  value={parameters.max_depth}
                  onChange={handleParameterChange('max_depth')}
                  inputProps={{ min: 1, max: 10, step: 1 }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
              <TextField
                  fullWidth
                  type="number"
                  label="Learning Rate"
                  value={parameters.learning_rate}
                  onChange={handleParameterChange('learning_rate')}
                  inputProps={{ 
                    min: 0.001, 
                    max: 1, 
                    step: 0.001,
                  }}
                />
              </Grid>
            </Grid>
          </Collapse>

          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading || !file || !targetColumn}
          >
            {loading ? 'Training...' : 'Train model'}
          </Button>
        </Card>
      </form>
          
      {result && (
        <Card sx={{ p: 3 }} elevation={0}>
          <Typography variant="h6" gutterBottom>Results</Typography>
          
          {taskType.includes('classification') ? (
            <>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Train accuracy
                  </Typography>
                  <Typography variant="h6">
                    {(result.metrics.train_accuracy! * 100).toFixed(2)}%
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Test accuracy
                  </Typography>
                  <Typography variant="h6">
                    {(result.metrics.test_accuracy! * 100).toFixed(2)}%
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" color="text.secondary">
                    AUC score
                  </Typography>
                  <Typography variant="h6">
                    {(result.metrics.auc_score! * 100).toFixed(2)}%
                  </Typography>
                </Grid>
              </Grid>
              
              {result.metrics.confusion_matrix && (
                <ConfusionMatrix 
                  matrix={result.metrics.confusion_matrix}
                  classMapping={result.class_mapping}
                />
              )}
            </>
          ) : (
            <>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Train RMSE
                  </Typography>
                  <Typography variant="h6">
                    {result.metrics.train_rmse?.toFixed(4)}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Test RMSE
                  </Typography>
                  <Typography variant="h6">
                    {result.metrics.test_rmse?.toFixed(4)}
                  </Typography>
                </Grid>
              </Grid>

              {result.metrics.test_predictions && (
                <RegressionPlot
                  actual={result.metrics.test_predictions.actual}
                  predicted={result.metrics.test_predictions.predicted}
                />
              )}
            </>
          )}
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h6" gutterBottom>
            Feature importance
          </Typography>
          <Grid container spacing={1}>
            {result.feature_names.map((name, i) => (
              <Grid item xs={12} sm={6} md={4} key={name}>
                <Box sx={{ display: 'flex' }}>
                  <Typography variant="body2">{name}:</Typography>
                  <Typography variant="body2" color="primary" marginLeft="6px">
                    {result.feature_importance[i].toFixed(4)}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ mt: 3 }}>
            <Button 
              variant="contained" 
              onClick={downloadModel}
            >
              Download model
            </Button>
          </Box>
        </Card>
      )}
    </Box>
  );
};