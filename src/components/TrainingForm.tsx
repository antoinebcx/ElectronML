import React, { useState } from 'react';
import { Box, Button, TextField, Card, Typography } from '@mui/material';
import { mlApi } from '../services/api';

interface TrainingResult {
  status: string;
  metrics: {
    train_accuracy: number;
    test_accuracy: number;
  };
  feature_importance: number[];
  feature_names: string[];
}

export const TrainingForm = () => {
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
    } catch (error) {
      console.error('Training failed:', error);
    } finally {
      setLoading(false);
    }
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
        </Card>
      )}
    </Box>
  );
};