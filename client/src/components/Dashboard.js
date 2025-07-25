import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  People, 
  Person, 
  Logout, 
  Add,
  Search,
  Settings,
  Notifications,
  Chat,
  Message,
  Dashboard as DashboardIcon,
  Group,
  PersonAdd,
  BugReport
} from '@mui/icons-material';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Box, 
  Paper, 
  TextField, 
  Button, 
  Avatar, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemAvatar, 
  IconButton, 
  Badge,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  InputAdornment,
  Tabs,
  Tab
} from '@mui/material';
import LoadingSpinner from './common/LoadingSpinner';
import Contacts from './Contacts';
import Conversations from './Conversations';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCounts, setUnreadCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    fetchDashboardData();
    
    // Check for tab parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam === 'contacts') {
      setActiveTab(1);
    }
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [profileRes, unreadRes] = await Promise.all([
        axios.get('/api/users/profile'),
        axios.get('/api/messages/unread/count')
      ]);

      setUnreadCounts(unreadRes.data.unreadCounts || {});
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Debug function
  const debugConversations = async () => {
    try {
      const response = await axios.get('/api/conversations/debug/all');
      const data = response.data;
      
      console.log('=== DEBUG: ALL CONVERSATIONS ===');
      console.log(`Total conversations: ${data.count}`);
      
      data.conversations.forEach((conv, index) => {
        console.log(`\n--- Conversation ${index + 1} ---`);
        console.log(`ID: ${conv.id}`);
        console.log(`Name: ${conv.name}`);
        console.log(`Type: ${conv.type}`);
        console.log(`Active: ${conv.isActive}`);
        console.log(`Participants (${conv.participants.length}):`);
        
        conv.participants.forEach((p, pIndex) => {
          console.log(`  ${pIndex + 1}. ${p.displayName || 'No name'}`);
          console.log(`     - Type: ${p.type}`);
          console.log(`     - Phone: ${p.phoneNumber || 'No phone'}`);
          console.log(`     - Identity: ${p.identity || 'No identity'}`);
          console.log(`     - Active: ${p.isActive}`);
        });
      });
      
      // Also show the raw data
      console.log('\n--- RAW DATA ---');
      console.log(JSON.stringify(data, null, 2));
      
      toast.success('Check browser console for debug info');
    } catch (error) {
      console.error('Debug error:', error);
      toast.error('Debug failed - check console');
    }
  };

  // Fix phone numbers function
  const fixPhoneNumbers = async () => {
    try {
      const response = await axios.post('/api/conversations/debug/fix-phone-numbers');
      console.log('Phone numbers fixed:', response.data);
      toast.success(`Fixed ${response.data.updated} phone numbers`);
    } catch (error) {
      console.error('Fix error:', error);
      toast.error('Failed to fix phone numbers');
    }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner size="lg" />
      </Box>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 0: // Conversations
        return <Conversations />;
      case 1: // Contacts
        return <Contacts />;
      default:
        return null;
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* Header */}
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Secure Messaging
          </Typography>
          <IconButton color="inherit">
            <Badge badgeContent={4} color="error">
              <Notifications />
            </Badge>
          </IconButton>
          <IconButton color="inherit">
            <Settings />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
            <Typography variant="body2" sx={{ mr: 2 }}>
              Welcome, {user.firstName}!
            </Typography>
            <Button
              color="inherit"
              onClick={handleLogout}
              startIcon={<Logout />}
              sx={{ textTransform: 'none' }}
            >
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
        {/* Navigation Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab 
              icon={<Chat />} 
              label="Conversations" 
              iconPosition="start"
            />
            <Tab 
              icon={<Person />} 
              label="Contacts" 
              iconPosition="start"
            />
          </Tabs>
        </Paper>

        {/* Tab Content */}
        {renderTabContent()}

        {/* Quick Actions */}
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <DashboardIcon sx={{ mr: 1 }} />
              Quick Actions
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Add />}
                  onClick={() => setActiveTab(1)} // Switch to Contacts tab
                  sx={{ py: 2 }}
                >
                  Add Contact
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  component={Link}
                  to="/profile"
                  variant="outlined"
                  fullWidth
                  startIcon={<Person />}
                  sx={{ py: 2 }}
                >
                  Manage Profile
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<People />}
                  onClick={() => setActiveTab(1)} // Switch to Contacts tab
                  sx={{ py: 2 }}
                >
                  Browse Contacts
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<Message />}
                  onClick={() => setActiveTab(1)} // Switch to Contacts tab
                  sx={{ py: 2 }}
                >
                  Start New Chat
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  component={Link}
                  to="/groups"
                  variant="outlined"
                  fullWidth
                  startIcon={<Group />}
                  sx={{ py: 2 }}
                >
                  Manage Groups
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  component={Link}
                  to="/patients"
                  variant="outlined"
                  fullWidth
                  startIcon={<People />}
                  sx={{ py: 2 }}
                >
                  Manage Patients & Compliance
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<BugReport />}
                  onClick={debugConversations}
                  sx={{ py: 2 }}
                >
                  Debug Conversations
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="outlined"
                  fullWidth
                  color="warning"
                  onClick={fixPhoneNumbers}
                  sx={{ py: 2 }}
                >
                  Fix Phone Numbers
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default Dashboard; 