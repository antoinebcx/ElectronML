import React, { useState } from 'react';
import { Box, Button, TextField, Card, Typography } from '@mui/material';
import { mlApi, TrainingResult } from '../services/api';

interface TrainingFormProps {
  onTrainingComplete?: (result: TrainingResult) => void;
}

export const TrainingForm = ({ onTrainingComplete }: TrainingFormProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [targetColumn, setTargetColumn] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrainingResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !targetColumn) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    const config = {
      target_column: targetColumn,
      parameters: {
        max_depth: 3,
        learning_rate: 0.1,
        n_estimators: 100
      }
    };

    try {
      const result = await mlApi.trainModel(formData, config);
      setResult(result);
      onTrainingComplete?.(result);
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

  const downloadTypeScript = () => {
    if (!result?.artifacts.typescript_code) return;
    
    const blob = new Blob(
      [result.artifacts.typescript_code], 
      { type: 'text/typescript' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'predictor.ts';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ p: 3 }}>
      <form onSubmit={handleSubmit}>
        <Card sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" gutterBottom>Train Model</Typography>
          <Box sx={{ mb: 2 }}>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </Box>
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
        <Card sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>Results</Typography>
          <Typography>
            Train Accuracy: {(result.metrics.train_accuracy * 100).toFixed(2)}%
          </Typography>
          <Typography>
            Test Accuracy: {(result.metrics.test_accuracy * 100).toFixed(2)}%
          </Typography>
          
          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
            Feature Importance
          </Typography>
          {result.feature_names.map((name, i) => (
            <Typography key={name}>
              {name}: {result.feature_importance[i].toFixed(4)}
            </Typography>
          ))}

          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button 
              variant="contained" 
              color="primary"
              onClick={downloadModel}
            >
              Download Model
            </Button>
            <Button 
              variant="contained" 
              color="secondary"
              onClick={downloadTypeScript}
            >
              Download TypeScript Code
            </Button>
          </Box>
        </Card>
      )}
    </Box>
  );
};