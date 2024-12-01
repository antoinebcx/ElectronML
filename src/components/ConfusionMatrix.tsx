import React from 'react';
import { Box, Card, Typography, Paper, Tooltip, useTheme } from '@mui/material';

interface ConfusionMatrixProps {
  matrix: number[][];
  classMapping?: Record<number, string>;
}

const ConfusionMatrix: React.FC<ConfusionMatrixProps> = ({ matrix, classMapping }) => {
  const theme = useTheme();
  const maxValue = Math.max(...matrix.flat());
  const totalSamples = matrix.flat().reduce((a, b) => a + b, 0);
  const isBinary = matrix.length === 2;
  
  const getBackgroundColor = (value: number) => {
    const intensity = value / maxValue;
    if (theme.palette.mode === 'dark') {
      return `rgba(99, 102, 241, ${intensity * 0.9})`;
    } else {
      return `rgba(99, 102, 241, ${intensity * 0.15})`;
    }
  };

  const getTextColor = (value: number) => {
    const intensity = value / maxValue;
    if (theme.palette.mode === 'dark') {
      return intensity > 0.3 ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.7)';
    } else {
      return theme.palette.text.primary;
    }
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
    <Card 
      sx={{ 
        p: 3, 
        bgcolor: 'background.paper',
        mt: 3,
        border: `1px solid ${theme.palette.divider}`,
      }} 
      elevation={0}
    >
      <Box sx={{ maxWidth: '100%', overflowX: 'auto' }}>
        <Typography variant="h6" sx={{ mb: 4, color: 'text.primary' }}>
          Confusion Matrix
        </Typography>

        <Box sx={{ 
          display: 'inline-flex',
          flexDirection: 'column',
          minWidth: 'min-content',
        }}>
          <Box sx={{ 
            display: 'flex',
            justifyContent: 'center',
            ml: '64px',
            mb: 2,
          }}>
            <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
              Predicted Class
            </Typography>
          </Box>

          <Box sx={{ display: 'flex' }}>
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

            <Box>
              <Box sx={{ 
                display: 'flex',
                ml: '64px',
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
                        color: 'text.secondary',
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

              {matrix.map((row, i) => (
                <Box 
                  key={`row-${i}`} 
                  sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    height: 64,
                  }}
                >
                  <Box sx={{ 
                    width: 64,
                    pr: 2,
                    textAlign: 'right',
                  }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {classLabels[i]}
                    </Typography>
                  </Box>

                  {row.map((value, j) => (
                    <Tooltip
                      key={`cell-${i}-${j}`}
                      title={getCellLabel(i, j, value)}
                      arrow
                      placement="top"
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
                          color: getTextColor(value),
                          border: `1px solid ${theme.palette.divider}`,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          '&:hover': {
                            transform: 'scale(1.05)',
                            zIndex: 1,
                            boxShadow: theme.shadows[3]
                          }
                        }}
                        elevation={0}
                      >
                        <Typography 
                          variant="body1" 
                          sx={{ 
                            fontWeight: 'bold',
                            color: 'inherit'
                          }}
                        >
                          {value}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            opacity: 0.8,
                            color: 'inherit'
                          }}
                        >
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