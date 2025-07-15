import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  Chat, 
  Person, 
  Message,
  Search,
  Add,
  Phone,
  Delete
} from '@mui/icons-material';
import { 
  Box, 
  Paper, 
  TextField, 
  Button, 
  Avatar, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemAvatar, 
  Badge,
  Typography,
  Card,
  CardContent,
  InputAdornment,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import LoadingSpinner from './common/LoadingSpinner';

const Conversations = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingConversation, setDeletingConversation] = useState(null);

  // Add state for patients and selectedPatientId
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false); // State for group creation dialog
  const [newGroup, setNewGroup] = useState({ name: '' }); // State for new group details

  useEffect(() => {
    fetchConversations();
    fetchPatients(); // Fetch patients on component mount
  }, []);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/conversations');
      console.log('Conversations API response:', response.data);
      // Handle the new API response format
      const conversationsData = response.data.conversations || response.data || [];
      setConversations(conversationsData);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Failed to load conversations');
      setConversations([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await axios.get('/api/users');
      setPatients(response.data.users || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast.error('Failed to load patients');
    }
  };

  const getConversationName = (conversation) => {
    if (conversation.name) {
      return conversation.name;
    }
    
    // For direct conversations
    if (conversation.conversationType === 'direct') {
      return 'Direct Chat';
    }
    
    // For SMS conversations
    if (conversation.conversationType === 'sms') {
      return 'SMS Conversation';
    }
    
    // For group conversations
    if (conversation.conversationType === 'group') {
      return conversation.name || 'Group Chat';
    }
    
    return conversation.name || 'Conversation';
  };

  const getConversationSubtitle = (conversation) => {
    if (conversation.conversationType === 'direct') {
      return 'Direct conversation';
    }
    
    // For SMS conversations
    if (conversation.conversationType === 'sms') {
      return 'SMS conversation';
    }
    
    // For group conversations
    if (conversation.conversationType === 'group') {
      return 'Group conversation';
    }
    
    return 'Conversation';
  };

  const getConversationType = (conversation) => {
    if (conversation.conversationType === 'sms') {
      return 'sms';
    }
    return 'app';
  };

  const getConversationIcon = (conversation) => {
    const type = getConversationType(conversation);
    return type === 'sms' ? <Phone /> : <Person />;
  };

  const getConversationAvatar = (conversation) => {
    if (conversation.conversationType === 'direct') {
      return 'D';
    }
    
    // For SMS conversations
    if (conversation.conversationType === 'sms') {
      return 'S';
    }
    
    // For group conversations
    if (conversation.conversationType === 'group') {
      return 'G';
    }
    
    return conversation.name ? conversation.name.charAt(0).toUpperCase() : 'C';
  };

  const handleDeleteConversation = async (conversation, e) => {
    e.preventDefault(); // Prevent navigation
    e.stopPropagation(); // Prevent event bubbling
    
    try {
      setDeletingConversation(conversation.id);
      await axios.delete(`/api/conversations/${conversation.id}`);
      toast.success('Conversation deleted successfully');
      fetchConversations();
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Failed to delete conversation');
    } finally {
      setDeletingConversation(null);
    }
  };

  const handleCreateGroup = async () => {
    try {
      const response = await axios.post('/api/conversations/group', {
        name: newGroup.name,
        patientId: selectedPatientId || null
      });
      toast.success('Group conversation created successfully');
      setShowCreateGroup(false);
      setNewGroup({ name: '' });
      setSelectedPatientId('');
      fetchConversations();
    } catch (error) {
      if (error.response?.data?.error.includes('consent')) {
        toast.error('Cannot add participants without consent for this patient');
      } else {
        toast.error('Failed to create group');
      }
    }
  };

  const filteredConversations = Array.isArray(conversations) ? conversations.filter(conversation => {
    const name = getConversationName(conversation).toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  }) : [];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <LoadingSpinner size="lg" />
      </Box>
    );
  }

  return (
    <Box>
      {/* Search Bar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search conversations..."
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

      {/* Conversations List */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
              <Chat sx={{ mr: 1 }} />
              Conversations
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              size="small"
              onClick={() => window.location.href = '/dashboard?tab=contacts'}
            >
              New Conversation
            </Button>
          </Box>

          {filteredConversations.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
              <Chat sx={{ fontSize: 48, mb: 2, opacity: 0.3 }} />
              <Typography variant="h6" gutterBottom>
                No conversations found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Start a conversation with a contact
              </Typography>
              <Button
                variant="text"
                color="primary"
                startIcon={<Add />}
                onClick={() => window.location.href = '/dashboard?tab=contacts'}
              >
                Start your first conversation
              </Button>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {filteredConversations.map((conversation) => (
                <ListItem
                  key={conversation.id}
                  component={Link}
                  to={`/chat/${conversation.id}`}
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
                    <Avatar sx={{ 
                      bgcolor: getConversationType(conversation) === 'sms' ? 'secondary.main' : 'primary.main' 
                    }}>
                      {getConversationAvatar(conversation)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getConversationName(conversation)}
                        <Chip 
                          label={getConversationType(conversation) === 'sms' ? 'SMS' : 'App'} 
                          size="small" 
                          color={getConversationType(conversation) === 'sms' ? 'secondary' : 'primary'}
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getConversationIcon(conversation)}
                        <Typography variant="body2" component="span">
                          {getConversationSubtitle(conversation)}
                        </Typography>
                        {conversation.lastMessageAt && (
                          <Typography variant="caption" color="text.secondary">
                            • {new Date(conversation.lastMessageAt).toLocaleDateString()}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {conversation.unreadCount > 0 && (
                      <Badge badgeContent={conversation.unreadCount} color="error" />
                    )}
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      startIcon={<Delete />}
                      onClick={(e) => handleDeleteConversation(conversation, e)}
                      disabled={deletingConversation === conversation.id}
                      sx={{ 
                        minWidth: 'auto',
                        px: 1,
                        py: 0.5,
                        fontSize: '0.75rem'
                      }}
                    >
                      {deletingConversation === conversation.id ? 'Deleting...' : 'Delete'}
                    </Button>
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Group Conversation Creation Dialog */}
      <Dialog open={showCreateGroup} onClose={() => setShowCreateGroup(false)}>
        <DialogTitle>Create New Group Conversation</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Group Name"
            variant="outlined"
            value={newGroup.name}
            onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Patient (for Compliance)</InputLabel>
            <Select value={selectedPatientId} onChange={e => setSelectedPatientId(e.target.value)}>
              <MenuItem value="">None</MenuItem>
              {patients.map(patient => (
                <MenuItem key={patient.id} value={patient.id}>{patient.firstName} {patient.lastName}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateGroup(false)} color="primary">Cancel</Button>
          <Button onClick={handleCreateGroup} variant="contained" color="primary">Create Group</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Conversations; 