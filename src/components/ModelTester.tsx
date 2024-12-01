import React, { useState, useCallback, useMemo } from 'react';
import { 
  Box, 
  Card, 
  TextField, 
  Button, 
  Typography, 
  Alert, 
  CircularProgress,
  Tooltip,
  IconButton,
  Collapse,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { Info as InfoIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { XGBoostPredictor } from './XGBoostPredictor';
import { DataPreprocessor } from './DataPreprocessor';

interface ModelTesterProps {
  modelData: string; // base64 encoded model
  preprocessingMetadata: string;
  featureNames: string[];
  classMapping?: Record<number, string>;
  isRegression?: boolean;
  onError?: (error: string) => void;
}

interface PredictionResult {
  predictedValue: number | string;
  probabilities?: number[];
  transformedFeatures: number[];
}

export const ModelTester: React.FC<ModelTesterProps> = ({ 
  modelData, 
  preprocessingMetadata,
  featureNames,
  classMapping,
  isRegression = false,
  onError
}) => {
  // State management
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);

  // Initialize preprocessor and get feature info
  const preprocessor = useMemo(() => {
    try {
      return new DataPreprocessor(preprocessingMetadata);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize preprocessor';
      setError(errorMessage);
      onError?.(errorMessage);
      return null;
    }
  }, [preprocessingMetadata, onError]);

  const featureInfo = useMemo(() => {
    return preprocessor?.getFeatureInfo() ?? {
      categoricalFeatures: {},
      numericFeatures: []
    };
  }, [preprocessor]);

  // Initialize predictor
  const getPredictor = useCallback(() => {
    try {
      const modelJson = atob(modelData);
      return new XGBoostPredictor(modelJson);
    } catch (err) {
      throw new Error('Failed to initialize model: Invalid model data');
    }
  }, [modelData]);

  const handleInputChange = useCallback((feature: string, value: string) => {
    setInputValues(prev => ({
      ...prev,
      [feature]: value
    }));
    setPrediction(null);
    setError(null);
  }, []);

  const resetForm = useCallback(() => {
    setInputValues({});
    setPrediction(null);
    setError(null);
  }, []);

  const handlePredict = async () => {
    setIsLoading(true);
    setError(null);
    setPrediction(null);

    try {
      if (!preprocessor) {
        throw new Error('Preprocessor not initialized');
      }

      // Transform features using preprocessor
      const transformedFeatures = preprocessor.transform(inputValues);
      
      // Get predictor instance
      const predictor = getPredictor();

      // Make prediction
      let predictedValue: number | string;
      let probabilities: number[] | undefined;

      if (isRegression) {
        predictedValue = predictor.predict(transformedFeatures);
      } else {
        const predictedClass = predictor.predict(transformedFeatures);
        predictedValue = classMapping ? classMapping[predictedClass] : predictedClass;
        probabilities = predictor.predict_proba(transformedFeatures);
      }

      setPrediction({
        predictedValue,
        probabilities,
        transformedFeatures
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const renderInputField = (feature: string) => {
    const isCategorical = feature in featureInfo.categoricalFeatures;
    const categories = isCategorical ? featureInfo.categoricalFeatures[feature] : [];
    
    return (
      <Box key={feature} sx={{ mb: 2 }}>
        <TextField
          label={feature}
          value={inputValues[feature] || ''}
          onChange={(e) => handleInputChange(feature, e.target.value)}
          error={Boolean(error && !inputValues[feature]?.trim())}
          helperText={isCategorical ? `Valid categories: ${categories.join(', ')}` : 'Enter numeric value'}
          disabled={isLoading}
          fullWidth
          size="small"
        />
      </Box>
    );
  };

  const renderPredictionResults = () => {
    if (!prediction) return null;

    return (
      <Card sx={{ mt: 3, p: 2 }}>
        <Typography variant="h6" gutterBottom color="primary">
          Prediction Results
        </Typography>

        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          {isRegression ? 'Predicted Value' : 'Predicted Class'}:{' '}
          <Box component="span" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            {typeof prediction.predictedValue === 'number' 
              ? prediction.predictedValue.toFixed(4)
              : prediction.predictedValue}
          </Box>
        </Typography>

        {!isRegression && prediction.probabilities && (
          <>
            <Typography variant="subtitle2" gutterBottom>
              Class Probabilities:
            </Typography>
            <TableContainer component={Paper} sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Class</TableCell>
                    <TableCell align="right">Probability</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {prediction.probabilities.map((prob, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        {classMapping ? classMapping[idx] : `Class ${idx}`}
                      </TableCell>
                      <TableCell align="right">
                        {(prob * 100).toFixed(2)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle2">
            Transformed Features
          </Typography>
          <IconButton 
            size="small" 
            onClick={() => setShowFeatures(!showFeatures)}
            sx={{ ml: 1 }}
          >
            <InfoIcon fontSize="small" />
          </IconButton>
        </Box>

        <Collapse in={showFeatures}>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Feature</TableCell>
                  <TableCell align="right">Transformed Value</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {featureNames.map((feature, idx) => (
                  <TableRow key={feature}>
                    <TableCell>{feature}</TableCell>
                    <TableCell align="right">
                      {prediction.transformedFeatures[idx].toFixed(4)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Collapse>
      </Card>
    );
  };

  return (
    <Card sx={{ p: 3, margin: '0px 23px 0px 23px' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          Test model
        </Typography>
        <Tooltip title="Reset form">
          <IconButton 
            onClick={resetForm}
            size="small"
            sx={{ ml: 2 }}
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ mb: 1 }}>
        {featureNames.map(feature => renderInputField(feature))}
      </Box>

      <Button 
        variant="contained" 
        onClick={handlePredict}
        disabled={isLoading || featureNames.some(f => !inputValues[f]?.trim())}
        sx={{ minWidth: 150 }}
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
          onClose={() => setError(null)}
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      )}

      {renderPredictionResults()}
    </Card>
  );
};

export default ModelTester;