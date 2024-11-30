import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { AttachFile, Close } from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { useTheme } from '@mui/material/styles';

interface FileUploadProps {
  onFileChange: (file: File | null) => void;
  currentFile: File | null;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileChange, currentFile }) => {
  const theme = useTheme();

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileChange(acceptedFiles[0]);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    multiple: false
  });

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileChange(null);
  };

  return (
    <Paper
      {...getRootProps()}
      sx={{
        border: `2px dashed ${isDragActive ? theme.palette.primary.main : theme.palette.divider}`,
        bgcolor: 'background.paper',
        p: 3,
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          borderColor: theme.palette.primary.main,
          bgcolor: theme.palette.mode === 'dark' 
            ? 'rgba(255, 255, 255, 0.05)'
            : 'rgba(0, 0, 0, 0.02)'
        }
      }}
    >
      <input {...getInputProps()} />
      
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1
        }}
      >
        {currentFile ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              width: '100%',
              justifyContent: 'space-between'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AttachFile sx={{ color: 'primary.main' }} />
              <Typography variant="body1">
                {currentFile.name}
              </Typography>
            </Box>
            <Close
              onClick={handleRemoveFile}
              sx={{
                color: 'text.secondary',
                cursor: 'pointer',
                '&:hover': {
                  color: 'error.main'
                }
              }}
            />
          </Box>
        ) : (
          <>
            <AttachFile 
              sx={{ 
                fontSize: 35,
                color: isDragActive ? 'primary.main' : 'text.secondary',
                mb: 1
              }} 
            />
            <Typography variant="body1" color="text.secondary" align="center">
              {isDragActive ? (
                'Drop your CSV file here'
              ) : (
                'Drop your CSV file here!'
              )}
            </Typography>
          </>
        )}
      </Box>
    </Paper>
  );
};