import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Box, Button, TextField, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { Add, Delete, Group } from '@mui/icons-material';
import LoadingSpinner from '../common/LoadingSpinner';

const GroupManager = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', description: '', selectedContacts: [] });

  useEffect(() => {
    fetchGroups();
    fetchContacts();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/groups');
      setGroups(response.data.groups || []);
    } catch (error) {
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
      const response = await axios.get('/api/contacts');
      setContacts(response.data.contacts || []);
    } catch (error) {
      toast.error('Failed to load contacts');
    }
  };

  const handleCreateGroup = async () => {
    try {
      const response = await axios.post('/api/groups', {
        name: newGroup.name,
        description: newGroup.description,
        contactIds: newGroup.selectedContacts
      });
      toast.success('Group created!');
      setShowCreateDialog(false);
      setNewGroup({ name: '', description: '', selectedContacts: [] });
      fetchGroups();
    } catch (error) {
      toast.error('Failed to create group');
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (window.confirm('Delete this group?')) {
      try {
        await axios.delete(`/api/groups/${groupId}`);
        toast.success('Group deleted');
        fetchGroups();
      } catch (error) {
        toast.error('Failed to delete group');
      }
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>Contact Groups</Typography>
      <Button variant="contained" startIcon={<Add />} onClick={() => setShowCreateDialog(true)} sx={{ mb: 2 }}>Create Group</Button>
      <List>
        {groups.map(group => (
          <ListItem key={group.id} divider>
            <ListItemText primary={group.name} secondary={group.description} />
            <ListItemSecondaryAction>
              <IconButton edge="end" onClick={() => handleDeleteGroup(group.id)}><Delete /></IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>

      <Dialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)}>
        <DialogTitle>Create New Group</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Group Name" value={newGroup.name} onChange={e => setNewGroup({ ...newGroup, name: e.target.value })} sx={{ mb: 2 }} />
          <TextField fullWidth label="Description" value={newGroup.description} onChange={e => setNewGroup({ ...newGroup, description: e.target.value })} sx={{ mb: 2 }} />
          <FormControl fullWidth>
            <InputLabel>Contacts</InputLabel>
            <Select multiple value={newGroup.selectedContacts} onChange={e => setNewGroup({ ...newGroup, selectedContacts: e.target.value })}>
              {contacts.map(contact => (
                <MenuItem key={contact.id} value={contact.id}>{contact.displayName}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateGroup} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GroupManager; 