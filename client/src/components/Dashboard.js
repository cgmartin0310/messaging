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
  Group,
  Chat,
  Message,
  Dashboard as DashboardIcon
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
  const [groups, setGroups] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [profileRes, unreadRes] = await Promise.all([
        axios.get('/api/users/profile'),
        axios.get('/api/messages/unread/count')
      ]);

      setGroups(profileRes.data.groups || []);
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

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      case 2: // Groups
        return (
          <Box>
            {/* Search Bar */}
            <Paper sx={{ p: 2, mb: 3 }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Search groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  )
                }}
              />
            </Paper>

            {/* Groups List */}
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                    <People sx={{ mr: 1 }} />
                    Groups
                  </Typography>
                  <Button
                    component={Link}
                    to="/groups"
                    variant="contained"
                    startIcon={<Add />}
                    size="small"
                  >
                    Manage Groups
                  </Button>
                </Box>

                {filteredGroups.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                    <Group sx={{ fontSize: 48, mb: 2, opacity: 0.3 }} />
                    <Typography variant="h6" gutterBottom>
                      No groups found
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Create groups to organize contacts
                    </Typography>
                    <Button
                      component={Link}
                      to="/groups"
                      variant="text"
                      color="primary"
                      startIcon={<Add />}
                    >
                      Create your first group
                    </Button>
                  </Box>
                ) : (
                  <List sx={{ p: 0 }}>
                    {filteredGroups.map((group) => (
                      <ListItem
                        key={group._id}
                        sx={{
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 1,
                          mb: 1
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            {group.name.charAt(0).toUpperCase()}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={group.name}
                          secondary={`${group.memberCount} members`}
                        />
                        <Button
                          component={Link}
                          to="/groups"
                          variant="outlined"
                          size="small"
                          startIcon={<People />}
                        >
                          View Members
                        </Button>
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Box>
        );
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
            <Tab 
              icon={<People />} 
              label="Groups" 
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
                  component={Link}
                  to="/groups"
                  variant="outlined"
                  fullWidth
                  startIcon={<Add />}
                  sx={{ py: 2 }}
                >
                  Create Group
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
                  component={Link}
                  to="/groups"
                  variant="outlined"
                  fullWidth
                  startIcon={<People />}
                  sx={{ py: 2 }}
                >
                  Browse Groups
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
            </Grid>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default Dashboard; 