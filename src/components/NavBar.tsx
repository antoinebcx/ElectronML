import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  useTheme,
  Tooltip,
} from '@mui/material';
import {
  LightModeOutlined,
  DarkModeOutlined,
} from '@mui/icons-material';

interface NavBarProps {
  onToggleTheme: () => void;
}

const NavBar: React.FC<NavBarProps> = ({ onToggleTheme }) => {
  const theme = useTheme();
  
  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        backgroundColor: 'transparent', //theme.palette.background.paper,
        // borderBottom: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Toolbar>
        <Typography 
          component="div" 
          sx={{
            fontSize: '18px', 
            fontWeight: 600, 
            flexGrow: 1,
            color: theme.palette.text.primary
          }}
        >
          ElectronML
        </Typography>
        
        <IconButton
          onClick={onToggleTheme}
          sx={{ ml: 1 }}
          color={theme.palette.mode === 'dark' ? '#ffffff' : '#000000'}
        >
          {theme.palette.mode === 'dark' ? <LightModeOutlined /> : <DarkModeOutlined />}
        </IconButton>
      </Toolbar>
    </AppBar>
  );
};

export default NavBar;