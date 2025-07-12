import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

const LoadingSpinner = ({ size = 'medium', message = 'Loading...' }) => {
  const getSize = () => {
    switch (size) {
      case 'small':
        return 24;
      case 'large':
      case 'lg':
        return 48;
      default:
        return 32;
    }
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center',
      gap: 2
    }}>
      <CircularProgress size={getSize()} />
      {message && (
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      )}
    </Box>
  );
};

export default LoadingSpinner; 