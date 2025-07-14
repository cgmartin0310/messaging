import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Divider
} from '@mui/material';
import { Add, Delete, Phone, Person } from '@mui/icons-material';

const TwilioNumberManager = () => {
  const [numbers, setNumbers] = useState({ available: [], assigned: [] });
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newNumber, setNewNumber] = useState('');

  useEffect(() => {
    fetchNumbers();
  }, []);

  const fetchNumbers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/twilio-numbers');
      setNumbers(response.data.numbers);
    } catch (error) {
      console.error('Error fetching numbers:', error);
      toast.error('Failed to fetch Twilio numbers');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNumber = async () => {
    try {
      if (!newNumber.trim()) {
        toast.error('Please enter a phone number');
        return;
      }

      await axios.post('/api/twilio-numbers', { phoneNumber: newNumber });
      toast.success('Twilio number added successfully');
      setNewNumber('');
      setAddDialogOpen(false);
      fetchNumbers();
    } catch (error) {
      console.error('Error adding number:', error);
      toast.error(error.response?.data?.message || 'Failed to add Twilio number');
    }
  };

  const handleRemoveNumber = async (phoneNumber) => {
    try {
      await axios.delete(`/api/twilio-numbers/${phoneNumber}`);
      toast.success('Twilio number removed successfully');
      fetchNumbers();
    } catch (error) {
      console.error('Error removing number:', error);
      toast.error(error.response?.data?.message || 'Failed to remove Twilio number');
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading Twilio numbers...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Twilio Number Manager
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setAddDialogOpen(true)}
        >
          Add Twilio Number
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Available Numbers */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Available Numbers ({numbers.available.length})
              </Typography>
              <List>
                {numbers.available.map((number) => (
                  <ListItem key={number}>
                    <ListItemText
                      primary={number}
                      secondary="Available for assignment"
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => handleRemoveNumber(number)}
                        color="error"
                      >
                        <Delete />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
                {numbers.available.length === 0 && (
                  <ListItem>
                    <ListItemText
                      primary="No available numbers"
                      secondary="Add Twilio numbers to the pool"
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Assigned Numbers */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Assigned Numbers ({numbers.assigned.length})
              </Typography>
              <List>
                {numbers.assigned.map((assignment) => (
                  <ListItem key={assignment.number}>
                    <ListItemText
                      primary={assignment.number}
                      secondary={`Assigned to user ${assignment.userId}`}
                    />
                    <Chip
                      label="Assigned"
                      color="primary"
                      size="small"
                    />
                  </ListItem>
                ))}
                {numbers.assigned.length === 0 && (
                  <ListItem>
                    <ListItemText
                      primary="No assigned numbers"
                      secondary="Numbers will appear here when assigned to users"
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Add Number Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)}>
        <DialogTitle>Add Twilio Number</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Phone Number"
            type="text"
            fullWidth
            variant="outlined"
            value={newNumber}
            onChange={(e) => setNewNumber(e.target.value)}
            placeholder="+19104442405 or 9104442405"
            helperText="Enter your Twilio phone number (will be formatted automatically)"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddNumber} variant="contained">
            Add Number
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TwilioNumberManager; 