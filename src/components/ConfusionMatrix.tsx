import React from 'react';
import { Box, Card, Typography, Paper, Tooltip } from '@mui/material';

interface ConfusionMatrixProps {
  matrix: number[][];
  classMapping?: Record<number, string>;
}

const ConfusionMatrix: React.FC<ConfusionMatrixProps> = ({ matrix, classMapping }) => {
  const maxValue = Math.max(...matrix.flat());
  const totalSamples = matrix.flat().reduce((a, b) => a + b, 0);
  const isBinary = matrix.length === 2;
  
  const getBackgroundColor = (value: number) => {
    const intensity = Math.floor((value / maxValue) * 255);
    return `rgb(10, 10, ${Math.min(255, intensity + 50)})`;
  };

  const classLabels = classMapping 
    ? Object.values(classMapping) 
    : matrix.map((_, idx) => `Class ${idx}`);

  const getCellLabel = (i: number, j: number, value: number): string => {
    if (!isBinary) return `${value} (${((value / totalSamples) * 100).toFixed(1)}%)`;

    const labels = {
      '0-0': 'True Negative (TN)',
      '0-1': 'False Positive (FP)',
      '1-0': 'False Negative (FN)',
      '1-1': 'True Positive (TP)'
    };
    return `${labels[`${i}-${j}`]}\n${value} (${((value / totalSamples) * 100).toFixed(1)}%)`;
  };

  return (
    <Card sx={{ p: 3, bgcolor: 'background.paper', mt: 3 }}>
      {/* Main container with constrained width */}
      <Box sx={{ 
        maxWidth: '100%',
        overflowX: 'auto',
      }}>
        {/* Title */}
        <Typography variant="h6" sx={{ mb: 4, color: 'text.primary' }}>
          Confusion Matrix
        </Typography>

        {/* Matrix container with fixed proportions */}
        <Box sx={{ 
          display: 'inline-flex',
          flexDirection: 'column',
          minWidth: 'min-content',
        }}>
          {/* Predicted Class Label */}
          <Box sx={{ 
            display: 'flex',
            justifyContent: 'center',
            ml: '64px', // Compensate for the vertical label space
            mb: 2,
          }}>
            <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
              Predicted Class
            </Typography>
          </Box>

          {/* Matrix content */}
          <Box sx={{ display: 'flex' }}>
            {/* Actual Class Label (Vertical) */}
            <Box sx={{ 
              display: 'flex',
              alignItems: 'center',
              mr: 2
            }}>
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  transform: 'rotate(-90deg)',
                  whiteSpace: 'nowrap',
                  color: 'text.secondary'
                }}
              >
                Actual Class
              </Typography>
            </Box>

            {/* Matrix with labels */}
            <Box>
              {/* Top labels */}
              <Box sx={{ 
                display: 'flex',
                ml: '64px', // Width of the row labels
                mb: 1,
              }}>
                {classLabels.map((label, idx) => (
                  <Box 
                    key={`top-${idx}`} 
                    sx={{ 
                      width: 64,
                      textAlign: 'center',
                    }}
                  >
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: 'text.primary',
                        transform: 'rotate(-20deg)',
                        transformOrigin: 'bottom left',
                        width: 'min-content',
                        whiteSpace: 'nowrap',
                        position: 'relative',
                        left: '12px',
                      }}
                    >
                      {label}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* Matrix rows */}
              {matrix.map((row, i) => (
                <Box 
                  key={`row-${i}`} 
                  sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    height: 64,
                  }}
                >
                  {/* Row label */}
                  <Box sx={{ 
                    width: 64,
                    pr: 2,
                    textAlign: 'right',
                  }}>
                    <Typography variant="body2" sx={{ color: 'text.primary' }}>
                      {classLabels[i]}
                    </Typography>
                  </Box>

                  {/* Matrix cells */}
                  {row.map((value, j) => (
                    <Tooltip
                      key={`cell-${i}-${j}`}
                      title={getCellLabel(i, j, value)}
                      arrow
                    >
                      <Paper
                        sx={{
                          width: 64,
                          height: 64,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: getBackgroundColor(value),
                          color: value/maxValue > 0.3 ? 'white' : 'text.primary',
                          border: '1px solid rgba(255,255,255,0.12)',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          '&:hover': {
                            transform: 'scale(1.05)',
                            zIndex: 1,
                          }
                        }}
                        elevation={0}
                      >
                        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                          {value}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.8 }}>
                          {((value / totalSamples) * 100).toFixed(1)}%
                        </Typography>
                      </Paper>
                    </Tooltip>
                  ))}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>
    </Card>
  );
};

export default ConfusionMatrix;