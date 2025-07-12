import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  Person, 
  Add,
  Search,
  Message,
  Phone,
  Email,
  Note
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
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import LoadingSpinner from './common/LoadingSpinner';

const Contacts = () => {
  const [contacts, setContacts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [startingConversation, setStartingConversation] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addContactType, setAddContactType] = useState('external');
  const [newContact, setNewContact] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    displayName: '',
    email: '',
    notes: ''
  });

  useEffect(() => {
    fetchContacts();
    fetchUsers();
  }, []);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/contacts');
      setContacts(response.data.contacts || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/contacts/users/list');
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleStartConversation = async (contact) => {
    try {
      setStartingConversation(true);
      
      if (contact.contactType === 'internal') {
        // Create conversation with internal user
        const response = await axios.post('/api/conversations/direct', {
          recipientId: contact.userId
        });
        toast.success('Conversation started!');
        window.location.href = `/chat/${response.data.conversation.id}`;
      } else {
        // Create conversation with external contact (SMS)
        const response = await axios.post('/api/conversations/sms', {
          recipientPhoneNumber: contact.phoneNumber,
          recipientName: contact.displayName || `${contact.firstName} ${contact.lastName}`
        });
        toast.success('SMS conversation started!');
        window.location.href = `/chat/${response.data.conversation.id}`;
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error('Failed to start conversation');
    } finally {
      setStartingConversation(false);
    }
  };

  const handleAddContact = async () => {
    try {
      if (addContactType === 'external') {
        await axios.post('/api/contacts', newContact);
        toast.success('External contact added!');
      } else {
        // For internal contacts, we'll add them from the users list
        toast.info('Select a user from the list to add as contact');
      }
      
      setShowAddDialog(false);
      setNewContact({
        firstName: '',
        lastName: '',
        phoneNumber: '',
        displayName: '',
        email: '',
        notes: ''
      });
      fetchContacts();
    } catch (error) {
      console.error('Error adding contact:', error);
      toast.error('Failed to add contact');
    }
  };

  const handleAddUserAsContact = async (user) => {
    try {
      await axios.post(`/api/contacts/users/${user.id}`);
      toast.success(`${user.displayName} added as contact!`);
      fetchContacts();
    } catch (error) {
      console.error('Error adding user as contact:', error);
      toast.error('Failed to add user as contact');
    }
  };

  const filteredContacts = contacts.filter(contact =>
    contact.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = users.filter(user =>
    user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
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
              variant="contained"
              startIcon={<Add />}
              size="small"
              onClick={() => setShowAddDialog(true)}
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
                variant="text"
                color="primary"
                startIcon={<Add />}
                onClick={() => setShowAddDialog(true)}
              >
                Add your first contact
              </Button>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {filteredContacts.map((contact) => (
                <ListItem
                  key={contact.id}
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
                      <Avatar sx={{ bgcolor: contact.contactType === 'internal' ? 'primary.main' : 'secondary.main' }}>
                        {contact.firstName.charAt(0).toUpperCase()}
                      </Avatar>
                    )}
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {contact.displayName || `${contact.firstName} ${contact.lastName}`}
                        <Chip 
                          label={contact.contactType === 'internal' ? 'App User' : 'SMS'} 
                          size="small" 
                          color={contact.contactType === 'internal' ? 'primary' : 'secondary'}
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        {contact.phoneNumber && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Phone sx={{ fontSize: 14 }} />
                            <Typography variant="body2" component="span">
                              {contact.phoneNumber}
                            </Typography>
                          </Box>
                        )}
                        {contact.email && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Email sx={{ fontSize: 14 }} />
                            <Typography variant="body2" component="span">
                              {contact.email}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    }
                  />
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<Message />}
                    onClick={() => handleStartConversation(contact)}
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
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Add Contact Dialog */}
      <Dialog open={showAddDialog} onClose={() => setShowAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Contact</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Contact Type</InputLabel>
            <Select
              value={addContactType}
              onChange={(e) => setAddContactType(e.target.value)}
              label="Contact Type"
            >
              <MenuItem value="external">External Contact (SMS)</MenuItem>
              <MenuItem value="internal">App User</MenuItem>
            </Select>
          </FormControl>

          {addContactType === 'external' ? (
            <Box>
              <TextField
                fullWidth
                label="First Name"
                value={newContact.firstName}
                onChange={(e) => setNewContact({...newContact, firstName: e.target.value})}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Last Name"
                value={newContact.lastName}
                onChange={(e) => setNewContact({...newContact, lastName: e.target.value})}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Phone Number"
                value={newContact.phoneNumber}
                onChange={(e) => setNewContact({...newContact, phoneNumber: e.target.value})}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Display Name (optional)"
                value={newContact.displayName}
                onChange={(e) => setNewContact({...newContact, displayName: e.target.value})}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Email (optional)"
                value={newContact.email}
                onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Notes (optional)"
                value={newContact.notes}
                onChange={(e) => setNewContact({...newContact, notes: e.target.value})}
                multiline
                rows={3}
              />
            </Box>
          ) : (
            <Box>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Select an app user to add as a contact:
              </Typography>
              <List>
                {filteredUsers.map((user) => (
                  <ListItem key={user.id} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mb: 1 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        {user.firstName.charAt(0).toUpperCase()}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={user.displayName}
                      secondary={`@${user.username} • ${user.phoneNumber}`}
                    />
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleAddUserAsContact(user)}
                    >
                      Add as Contact
                    </Button>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddDialog(false)}>Cancel</Button>
          {addContactType === 'external' && (
            <Button onClick={handleAddContact} variant="contained">
              Add Contact
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Contacts; 