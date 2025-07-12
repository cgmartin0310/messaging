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
  Message
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
  InputAdornment
} from '@mui/material';
import LoadingSpinner from './common/LoadingSpinner';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [startingConversation, setStartingConversation] = useState(false);

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
      setContacts(profileRes.data.contacts || []);
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

  const handleStartConversation = async (contactId) => {
    try {
      setStartingConversation(true);
      
      // Create a group (conversation) with the selected contact
      const response = await axios.post('/api/groups', {
        name: `Direct Chat`,
        description: 'Direct conversation',
        memberIds: [contactId]
      });

      const groupId = response.data.group.id;
      toast.success('Conversation started!');
      
      // Navigate to the chat
      navigate(`/chat/${groupId}`);
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error('Failed to start conversation');
    } finally {
      setStartingConversation(false);
    }
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredContacts = contacts.filter(contact =>
    contact.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner size="lg" />
      </Box>
    );
  }

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
        {/* Search Bar */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search groups and contacts..."
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

        <Grid container spacing={3}>
          {/* Groups Section */}
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                    <People sx={{ mr: 1 }} />
                    Your Groups
                  </Typography>
                  <Button
                    component={Link}
                    to="/groups"
                    variant="contained"
                    startIcon={<Add />}
                    size="small"
                  >
                    Create Group
                  </Button>
                </Box>

                {filteredGroups.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                    <Group sx={{ fontSize: 48, mb: 2, opacity: 0.3 }} />
                    <Typography variant="h6" gutterBottom>
                      No groups found
                    </Typography>
                    <Button
                      component={Link}
                      to="/groups"
                      variant="text"
                      color="primary"
                    >
                      Create your first group
                    </Button>
                  </Box>
                ) : (
                  <List sx={{ p: 0 }}>
                    {filteredGroups.map((group) => (
                      <ListItem
                        key={group._id}
                        component={Link}
                        to={`/chat/${group._id}`}
                        sx={{
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 1,
                          mb: 1,
                          '&:hover': { bgcolor: 'action.hover' },
                          textDecoration: 'none',
                          color: 'inherit'
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
                        {unreadCounts[group._id] > 0 && (
                          <Badge badgeContent={unreadCounts[group._id]} color="error" />
                        )}
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Contacts Section */}
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                    <Person sx={{ mr: 1 }} />
                    Your Contacts
                  </Typography>
                  <Button
                    component={Link}
                    to="/profile"
                    variant="outlined"
                    startIcon={<Add />}
                    size="small"
                  >
                    Add Contact
                  </Button>
                </Box>

                {filteredContacts.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                    <Person sx={{ fontSize: 48, mb: 2, opacity: 0.3 }} />
                    <Typography variant="h6" gutterBottom>
                      No contacts found
                    </Typography>
                    <Button
                      component={Link}
                      to="/profile"
                      variant="text"
                      color="primary"
                    >
                      Add your first contact
                    </Button>
                  </Box>
                ) : (
                  <List sx={{ p: 0 }}>
                    {filteredContacts.map((contact) => (
                      <ListItem
                        key={contact._id}
                        sx={{
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 1,
                          mb: 1
                        }}
                      >
                        <ListItemAvatar>
                          {contact.avatar ? (
                            <Avatar src={contact.avatar} />
                          ) : (
                            <Avatar sx={{ bgcolor: 'grey.300' }}>
                              {contact.firstName.charAt(0).toUpperCase()}
                            </Avatar>
                          )}
                        </ListItemAvatar>
                        <ListItemText
                          primary={`${contact.firstName} ${contact.lastName}`}
                          secondary={`@${contact.username}`}
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              bgcolor: contact.isActive ? 'success.main' : 'grey.300'
                            }}
                          />
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<Message />}
                            onClick={() => handleStartConversation(contact._id)}
                            disabled={startingConversation}
                            sx={{ 
                              minWidth: 'auto',
                              px: 2,
                              py: 0.5,
                              fontSize: '0.75rem'
                            }}
                          >
                            {startingConversation ? 'Starting...' : 'Start Chat'}
                          </Button>
                        </Box>
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Quick Actions */}
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
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
                  component={Link}
                  to="/chat"
                  variant="outlined"
                  fullWidth
                  startIcon={<Chat />}
                  sx={{ py: 2 }}
                >
                  Recent Chats
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<Message />}
                  onClick={() => navigate('/groups')}
                  sx={{ py: 2 }}
                >
                  Start New Conversation
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