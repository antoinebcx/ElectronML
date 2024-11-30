import React, { useMemo } from 'react';
import { Card, Typography, Box, useTheme } from '@mui/material';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
  Label
} from 'recharts';

interface RegressionPlotProps {
  actual: number[];
  predicted: number[];
}

const RegressionPlot: React.FC<RegressionPlotProps> = ({ actual, predicted }) => {
  const theme = useTheme();

  // Memoize data processing
  const {
    data,
    min,
    max,
    r2,
    rmse,
    meanAbsError
  } = useMemo(() => {
    // Create data points and calculate ranges
    const combinedData = actual.map((act, index) => ({
      actual: act,
      predicted: predicted[index],
    }));

    const allValues = [...actual, ...predicted];
    const minVal = Math.floor(Math.min(...allValues));
    const maxVal = Math.ceil(Math.max(...allValues));
    
    // Add padding to the range
    const range = maxVal - minVal;
    const padding = range * 0.05;
    
    // Calculate R² (R-squared)
    const actualMean = actual.reduce((sum, val) => sum + val, 0) / actual.length;
    const totalSS = actual.reduce((sum, val) => sum + Math.pow(val - actualMean, 2), 0);
    const residualSS = actual.reduce((sum, val, i) => sum + Math.pow(val - predicted[i], 2), 0);
    const r2Score = 1 - (residualSS / totalSS);

    // Calculate RMSE
    const rmseScore = Math.sqrt(
      actual.reduce((sum, val, i) => sum + Math.pow(val - predicted[i], 2), 0) / actual.length
    );

    // Calculate Mean Absolute Error
    const mae = actual.reduce((sum, val, i) => sum + Math.abs(val - predicted[i]), 0) / actual.length;

    return {
      data: combinedData,
      min: minVal - padding,
      max: maxVal + padding,
      r2: r2Score,
      rmse: rmseScore,
      meanAbsError: mae
    };
  }, [actual, predicted]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const error = data.predicted - data.actual;
      const percentError = (error / data.actual) * 100;

      return (
        <Box sx={{ 
          bgcolor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 1,
          p: 1.5,
          boxShadow: theme.shadows[3]
        }}>
          <Typography variant="caption" sx={{ 
            color: theme.palette.text.secondary,
            display: 'block',
            mb: 1
          }}>
            Point Details:
          </Typography>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'auto 1fr',
            gap: 1,
            '& > *:nth-of-type(odd)': {
              color: theme.palette.text.secondary,
              pr: 2
            }
          }}>
            <Typography variant="body2">Actual:</Typography>
            <Typography variant="body2">{data.actual.toFixed(3)}</Typography>
            <Typography variant="body2">Predicted:</Typography>
            <Typography variant="body2">{data.predicted.toFixed(3)}</Typography>
            <Typography variant="body2">Error:</Typography>
            <Typography variant="body2">
              {error > 0 ? '+' : ''}{error.toFixed(3)}
            </Typography>
            <Typography variant="body2">% Error:</Typography>
            <Typography variant="body2">
              {error > 0 ? '+' : ''}{percentError.toFixed(1)}%
            </Typography>
          </Box>
        </Box>
      );
    }
    return null;
  };

  return (
    <Card sx={{
      p: 3,
      bgcolor: 'background.paper',
      mt: 3,
      width: '100%'
    }}>
      {/* Header section with metrics */}
      <Box sx={{ 
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
        gap: 2,
        mb: 3
      }}>
        <Box>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 0.5 }}>
            R² Score
          </Typography>
          <Typography variant="h6" sx={{ color: 'text.primary' }}>
            {r2.toFixed(4)}
          </Typography>
        </Box>
        <Box>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 0.5 }}>
            RMSE
          </Typography>
          <Typography variant="h6" sx={{ color: 'text.primary' }}>
            {rmse.toFixed(4)}
          </Typography>
        </Box>
        <Box>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 0.5 }}>
            Mean Absolute Error
          </Typography>
          <Typography variant="h6" sx={{ color: 'text.primary' }}>
            {meanAbsError.toFixed(4)}
          </Typography>
        </Box>
      </Box>

      {/* Chart container with fixed aspect ratio */}
      <Box sx={{ 
        width: '100%',
        height: { xs: 300, sm: 400, md: 500 },
        position: 'relative'
      }}>
        <ResponsiveContainer>
          <ScatterChart
            margin={{ top: 20, right: 30, bottom: 50, left: 50 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={theme.palette.divider}
            />
            <XAxis
              type="number"
              dataKey="actual"
              name="Actual"
              domain={[min, max]}
              tick={{ fill: theme.palette.text.secondary }}
            >
              <Label
                value="Actual Values"
                position="bottom"
                offset={30}
                style={{ 
                  fill: theme.palette.text.primary,
                  fontSize: 12
                }}
              />
            </XAxis>
            <YAxis
              type="number"
              dataKey="predicted"
              name="Predicted"
              domain={[min, max]}
              tick={{ fill: theme.palette.text.secondary }}
            >
              <Label
                value="Predicted Values"
                angle={-90}
                position="left"
                offset={35}
                style={{ 
                  fill: theme.palette.text.primary,
                  fontSize: 12
                }}
              />
            </YAxis>
            
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="top" 
              height={36}
              formatter={(value) => (
                <span style={{ color: theme.palette.text.primary }}>{value}</span>
              )}
            />
            
            {/* Perfect prediction line (diagonal) */}
            <ReferenceLine
              segment={[
                { x: min, y: min },
                { x: max, y: max }
              ]}
              stroke={theme.palette.divider}
              strokeDasharray="5 5"
              name="Perfect Prediction"
            />
            
            {/* Data points */}
            <Scatter
              name="Predictions"
              data={data}
              fill={theme.palette.primary.main}
              opacity={0.6}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </Box>

      {/* Legend explanation */}
      <Box sx={{ 
        mt: 2,
        p: 2,
        bgcolor: theme.palette.background.default,
        borderRadius: 1,
        border: `1px solid ${theme.palette.divider}`
      }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          The diagonal line represents perfect predictions. Points closer to this line indicate more accurate predictions. 
          Points above the line indicate over-predictions, while points below indicate under-predictions.
        </Typography>
      </Box>
    </Card>
  );
};

export default RegressionPlot;