import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  Chat, 
  Group, 
  Person, 
  Message,
  Search,
  Add
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
  CircularProgress
} from '@mui/material';
import LoadingSpinner from './common/LoadingSpinner';

const Conversations = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/conversations');
      setConversations(response.data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const getConversationName = (conversation) => {
    if (conversation.name) {
      return conversation.name;
    }
    
    // For direct conversations, show the other person's name
    if (conversation.conversationType === 'direct') {
      const otherParticipant = conversation.participants.find(p => 
        p.participantType === 'user' && p.identity !== conversation.currentUserId
      );
      return otherParticipant ? otherParticipant.displayName : 'Direct Chat';
    }
    
    // For group conversations, show group name
    return conversation.name || 'Group Chat';
  };

  const getConversationSubtitle = (conversation) => {
    if (conversation.conversationType === 'direct') {
      return 'Direct conversation';
    }
    
    const participantCount = conversation.participants.length;
    return `${participantCount} participant${participantCount !== 1 ? 's' : ''}`;
  };

  const getConversationIcon = (conversation) => {
    if (conversation.conversationType === 'direct') {
      return <Person />;
    }
    return <Group />;
  };

  const getConversationAvatar = (conversation) => {
    if (conversation.conversationType === 'direct') {
      const otherParticipant = conversation.participants.find(p => 
        p.participantType === 'user' && p.identity !== conversation.currentUserId
      );
      return otherParticipant ? otherParticipant.displayName.charAt(0).toUpperCase() : '?';
    }
    return conversation.name ? conversation.name.charAt(0).toUpperCase() : 'G';
  };

  const filteredConversations = conversations.filter(conversation => {
    const name = getConversationName(conversation).toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

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
              component={Link}
              to="/groups"
              variant="contained"
              startIcon={<Add />}
              size="small"
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
                Start a conversation with a contact or join a group
              </Typography>
              <Button
                component={Link}
                to="/groups"
                variant="text"
                color="primary"
                startIcon={<Add />}
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
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      {getConversationAvatar(conversation)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={getConversationName(conversation)}
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
                  {conversation.unreadCount > 0 && (
                    <Badge badgeContent={conversation.unreadCount} color="error" />
                  )}
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default Conversations; 