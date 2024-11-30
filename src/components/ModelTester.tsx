import React, { useState, useCallback } from 'react';
import { Box, Card, TextField, Button, Typography, Alert, CircularProgress } from '@mui/material';
import { XGBoostPredictor } from './XGBoostPredictor';

interface ModelTesterProps {
  modelData: string; // base64 encoded model
  featureNames: string[];
  categoricalFeatures?: Record<string, Record<string, number>>;
  classMapping?: Record<number, string>;
  onError?: (error: string) => void;
}

interface PredictionResult {
  class: number | string;
  probabilities: number[];
}

export const ModelTester: React.FC<ModelTesterProps> = ({ 
  modelData, 
  featureNames, 
  categoricalFeatures = {}, 
  classMapping,
  onError
}: ModelTesterProps) => {
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Memoized predictor instance
  const getPredictor = useCallback(() => {
    try {
      const modelJson = atob(modelData);
      return new XGBoostPredictor(modelJson);
    } catch (err) {
      throw new Error('Failed to initialize model: Invalid model data');
    }
  }, [modelData]);

  const validateInput = useCallback((feature: string, value: string): number => {
    if (!value.trim()) {
      throw new Error(`Please provide a value for ${feature}`);
    }

    // Handle categorical features
    if (feature in categoricalFeatures) {
      const mapping = categoricalFeatures[feature];
      const categoryValue = mapping[value];
      
      if (categoryValue === undefined) {
        const validValues = Object.keys(mapping).join(', ');
        throw new Error(
          `Invalid category "${value}" for feature "${feature}". ` +
          `Valid values are: ${validValues}`
        );
      }
      
      return categoryValue;
    }

    // Handle numerical features
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      throw new Error(`Invalid numerical value for ${feature}`);
    }
    return numValue;
  }, [categoricalFeatures]);

  const handleInputChange = useCallback((feature: string, value: string) => {
    setInputValues(prev => ({
      ...prev,
      [feature]: value
    }));
    setPrediction(null);
    setError(null);
  }, []);

  const handlePredict = async () => {
    setIsLoading(true);
    setError(null);
    setPrediction(null);

    try {
      const predictor = getPredictor();
      
      // Convert and validate all inputs
      const features = featureNames.map(feature => 
        validateInput(feature, inputValues[feature] || '')
      );

      // Make prediction
      const predictedClass = predictor.predict(features);
      const probabilities = predictor.predict_proba(features);

      // Format prediction result
      setPrediction({
        class: classMapping ? classMapping[predictedClass] : predictedClass,
        probabilities
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const renderPredictionResults = () => {
    if (!prediction) return null;

    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Prediction Result
        </Typography>
        <Typography variant="subtitle1" color="primary" gutterBottom>
          Predicted Class: {prediction.class}
        </Typography>
        
        <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>
          Class Probabilities:
        </Typography>
        <Box sx={{ pl: 2 }}>
          {prediction.probabilities.map((prob, idx) => (
            <Typography key={idx} color="text.secondary">
              {classMapping ? classMapping[idx] : `Class ${idx}`}: 
              <Box component="span" sx={{ ml: 1, fontWeight: 'bold' }}>
                {(prob * 100).toFixed(2)}%
              </Box>
            </Typography>
          ))}
        </Box>
      </Box>
    );
  };

  return (
    <Card sx={{ p: 3, mt: 3 }}>
      <Typography variant="h6" gutterBottom color="primary">
        Model Testing Interface
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
        {featureNames.map(feature => (
          <TextField
            key={feature}
            label={feature}
            value={inputValues[feature] || ''}
            onChange={(e) => handleInputChange(feature, e.target.value)}
            helperText={
              feature in categoricalFeatures 
                ? `Categories: ${Object.keys(categoricalFeatures[feature]).join(', ')}`
                : 'Enter numeric value'
            }
            error={Boolean(error && !inputValues[feature]?.trim())}
            disabled={isLoading}
            fullWidth
            size="small"
          />
        ))}
      </Box>

      <Button 
        variant="contained" 
        onClick={handlePredict}
        disabled={isLoading || featureNames.some(f => !inputValues[f]?.trim())}
        sx={{ mb: 2, minWidth: 150 }}
      >
        {isLoading ? (
          <>
            <CircularProgress size={20} sx={{ mr: 1 }} />
            Processing...
          </>
        ) : 'Make Prediction'}
      </Button>

      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {renderPredictionResults()}
    </Card>
  );
};