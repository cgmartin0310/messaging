import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  Person, 
  Add,
  Search,
  Message,
  Group
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
  Typography,
  Card,
  CardContent,
  InputAdornment,
  Chip
} from '@mui/material';
import LoadingSpinner from './common/LoadingSpinner';

const Contacts = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [startingConversation, setStartingConversation] = useState(false);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/users/profile');
      setContacts(response.data.contacts || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleStartConversation = async (contactId) => {
    try {
      setStartingConversation(true);
      
      // Create a direct conversation with the selected contact
      const response = await axios.post('/api/conversations/direct', {
        recipientId: contactId
      });

      toast.success('Conversation started!');
      
      // Navigate to the chat
      window.location.href = `/chat/${response.data.conversation.id}`;
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error('Failed to start conversation');
    } finally {
      setStartingConversation(false);
    }
  };

  const handleAddToGroup = async (contactId) => {
    try {
      // Navigate to groups page with contact pre-selected
      window.location.href = `/groups?addContact=${contactId}`;
    } catch (error) {
      console.error('Error adding to group:', error);
      toast.error('Failed to add to group');
    }
  };

  const filteredContacts = contacts.filter(contact =>
    contact.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          placeholder="Search contacts..."
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

      {/* Contacts List */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
              <Person sx={{ mr: 1 }} />
              Contacts
            </Typography>
            <Button
              component={Link}
              to="/profile"
              variant="contained"
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
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Add contacts to start conversations
              </Typography>
              <Button
                component={Link}
                to="/profile"
                variant="text"
                color="primary"
                startIcon={<Add />}
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
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" component="span">
                          @{contact.username}
                        </Typography>
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: contact.isActive ? 'success.main' : 'grey.300'
                          }}
                        />
                        {contact.isActive && (
                          <Chip 
                            label="Online" 
                            size="small" 
                            color="success" 
                            variant="outlined"
                          />
                        )}
                      </Box>
                    }
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Group />}
                      onClick={() => handleAddToGroup(contact._id)}
                      sx={{ 
                        minWidth: 'auto',
                        px: 2,
                        py: 0.5,
                        fontSize: '0.75rem'
                      }}
                    >
                      Add to Group
                    </Button>
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
                      {startingConversation ? 'Starting...' : 'Message'}
                    </Button>
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default Contacts; 