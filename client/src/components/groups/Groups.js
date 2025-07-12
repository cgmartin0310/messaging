import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  People, 
  Add, 
  Search, 
  Settings, 
  ArrowBack,
  Group,
  Person,
  Edit,
  Delete,
  MoreVert,
  Visibility,
  Chat
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
  Grid,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  InputAdornment,
  Menu,
  MenuItem,
  Chip
} from '@mui/material';
import LoadingSpinner from '../common/LoadingSpinner';

const Groups = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newGroupData, setNewGroupData] = useState({
    name: '',
    description: ''
  });
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/groups');
      console.log('Groups API response:', response.data);
      setGroups(response.data.groups);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupMembers = async (groupId) => {
    try {
      const response = await axios.get(`/api/groups/${groupId}/members`);
      setSelectedGroupMembers(response.data.members);
    } catch (error) {
      console.error('Error fetching group members:', error);
      toast.error('Failed to load group members');
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupData.name.trim()) {
      toast.error('Group name is required');
      return;
    }

    try {
      setCreating(true);
      const response = await axios.post('/api/groups', newGroupData);
      setGroups(prev => [response.data.group, ...prev]);
      setNewGroupData({ name: '', description: '' });
      setShowCreateDialog(false);
      toast.success('Group created successfully!');
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinGroup = async (groupId) => {
    try {
      await axios.post(`/api/groups/${groupId}/join`);
      toast.success('Joined group successfully!');
      fetchGroups(); // Refresh groups to update member count
    } catch (error) {
      console.error('Error joining group:', error);
      toast.error('Failed to join group');
    }
  };

  const handleLeaveGroup = async (groupId) => {
    try {
      await axios.post(`/api/groups/${groupId}/leave`);
      toast.success('Left group successfully!');
      fetchGroups(); // Refresh groups to update member count
    } catch (error) {
      console.error('Error leaving group:', error);
      toast.error('Failed to leave group');
    }
  };

  const handleDeleteGroup = async (groupId) => {
    try {
      await axios.delete(`/api/groups/${groupId}`);
      setGroups(prev => prev.filter(group => group.id !== groupId));
      toast.success('Group deleted successfully!');
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('Failed to delete group');
    }
  };

  const handleViewMembers = async (group) => {
    setSelectedGroup(group);
    await fetchGroupMembers(group.id);
    setShowMembersDialog(true);
  };

  const handleMenuOpen = (event, group) => {
    setAnchorEl(event.currentTarget);
    setSelectedGroup(group);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedGroup(null);
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchQuery.toLowerCase())
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
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/dashboard')}
            sx={{ mr: 2 }}
          >
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Groups
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setShowCreateDialog(true)}
          >
            Create Group
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
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
        {filteredGroups.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 8 }}>
              <Group sx={{ fontSize: 64, mb: 2, opacity: 0.3, color: 'text.secondary' }} />
              <Typography variant="h5" gutterBottom color="text.secondary">
                {searchQuery ? 'No groups found' : 'No groups yet'}
              </Typography>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                {searchQuery ? 'Try adjusting your search terms' : 'Create your first group to get started'}
              </Typography>
              {!searchQuery && (
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setShowCreateDialog(true)}
                  sx={{ mt: 2 }}
                >
                  Create Group
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {filteredGroups.map((group) => (
              <Grid item xs={12} sm={6} md={4} key={group.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
                        {group.name.charAt(0).toUpperCase()}
                      </Avatar>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, group)}
                      >
                        <MoreVert />
                      </IconButton>
                    </Box>
                    
                    <Typography variant="h6" gutterBottom>
                      {group.name}
                    </Typography>
                    
                    {group.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {group.description}
                      </Typography>
                    )}
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Person sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {group.memberCount} members
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {group.isMember ? (
                        <>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<Visibility />}
                            onClick={() => handleViewMembers(group)}
                            sx={{ flex: 1 }}
                          >
                            View Members
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => handleLeaveGroup(group.id)}
                            color="error"
                          >
                            Leave
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="contained"
                          fullWidth
                          size="small"
                          onClick={() => handleJoinGroup(group.id)}
                        >
                          Join Group
                        </Button>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* Create Group Dialog */}
      <Dialog 
        open={showCreateDialog} 
        onClose={() => setShowCreateDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Group</DialogTitle>
        <Box component="form" onSubmit={handleCreateGroup}>
          <DialogContent>
            <TextField
              fullWidth
              label="Group Name"
              value={newGroupData.name}
              onChange={(e) => setNewGroupData(prev => ({ ...prev, name: e.target.value }))}
              required
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Description (optional)"
              value={newGroupData.description}
              onChange={(e) => setNewGroupData(prev => ({ ...prev, description: e.target.value }))}
              multiline
              rows={3}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={creating || !newGroupData.name.trim()}
              startIcon={creating ? <CircularProgress size={16} /> : <Add />}
            >
              {creating ? 'Creating...' : 'Create Group'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Group Members Dialog */}
      <Dialog 
        open={showMembersDialog} 
        onClose={() => setShowMembersDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedGroup?.name} - Members
        </DialogTitle>
        <DialogContent>
          {selectedGroupMembers.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                No members found
              </Typography>
            </Box>
          ) : (
            <List>
              {selectedGroupMembers.map((member) => (
                <ListItem key={member.id} sx={{ px: 0 }}>
                  <ListItemAvatar>
                    {member.avatar ? (
                      <Avatar src={member.avatar} />
                    ) : (
                      <Avatar sx={{ bgcolor: 'grey.300' }}>
                        {member.firstName.charAt(0).toUpperCase()}
                      </Avatar>
                    )}
                  </ListItemAvatar>
                  <ListItemText
                    primary={`${member.firstName} ${member.lastName}`}
                    secondary={`@${member.username}`}
                  />
                  {member.isOwner && (
                    <Chip label="Owner" size="small" color="primary" />
                  )}
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowMembersDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Group Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {selectedGroup?.isOwner && (
          <MenuItem onClick={() => {
            // Handle edit group
            handleMenuClose();
          }}>
            <Edit sx={{ mr: 1 }} />
            Edit Group
          </MenuItem>
        )}
        {selectedGroup?.isOwner && (
          <MenuItem 
            onClick={() => {
              handleDeleteGroup(selectedGroup.id);
              handleMenuClose();
            }}
            sx={{ color: 'error.main' }}
          >
            <Delete sx={{ mr: 1 }} />
            Delete Group
          </MenuItem>
        )}
        {selectedGroup?.isMember && !selectedGroup?.isOwner && (
          <MenuItem 
            onClick={() => {
              handleLeaveGroup(selectedGroup.id);
              handleMenuClose();
            }}
            sx={{ color: 'error.main' }}
          >
            Leave Group
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
};

export default Groups; 