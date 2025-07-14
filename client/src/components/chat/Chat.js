import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Send, ArrowBack, People, MoreVert } from '@mui/icons-material';
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
  CircularProgress,
  Chip
} from '@mui/material';
import LoadingSpinner from '../common/LoadingSpinner';

const Chat = () => {
  const { conversationId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (conversationId) {
      fetchConversationAndMessages();
    }
  }, [conversationId]);

  const fetchConversationAndMessages = async () => {
    try {
      setLoading(true);
      console.log('Fetching conversation and messages for:', conversationId);
      
      const [conversationRes, messagesRes] = await Promise.all([
        axios.get(`/api/conversations/${conversationId}`),
        axios.get(`/api/messages/${conversationId}`)
      ]);

      console.log('Conversation response:', conversationRes.data);
      console.log('Messages response:', messagesRes.data);

      setConversation(conversationRes.data);
      setMessages(messagesRes.data.reverse()); // Show newest first
    } catch (error) {
      console.error('Error fetching chat data:', error);
      console.error('Error details:', error.response?.data);
      toast.error('Failed to load chat');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      setSending(true);
      const response = await axios.post(`/api/messages/${conversationId}`, {
        content: newMessage.trim()
      });

      setMessages(prev => [response.data.messageData, ...prev]);
      setNewMessage('');
      toast.success('Message sent!');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner size="lg" />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
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
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" component="div">
              {conversation?.name}
            </Typography>
            <Typography variant="body2" color="inherit" sx={{ opacity: 0.8 }}>
              {conversation?.participants?.length || 0} participants
            </Typography>
          </Box>
          <IconButton color="inherit">
            <People />
          </IconButton>
          <IconButton color="inherit">
            <MoreVert />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Messages */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', bgcolor: 'grey.50' }}>
        <Paper 
          elevation={0} 
          sx={{ 
            flexGrow: 1, 
            m: 2, 
            display: 'flex', 
            flexDirection: 'column',
            bgcolor: 'white',
            borderRadius: 2
          }}
        >
          {/* Messages List */}
          <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
            {messages.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
                <Typography variant="h6" gutterBottom>
                  No messages yet
                </Typography>
                <Typography variant="body2">
                  Start the conversation!
                </Typography>
              </Box>
            ) : (
              <List sx={{ p: 0 }}>
                {messages.map((message) => (
                  <ListItem
                    key={message.id}
                    sx={{
                      flexDirection: 'column',
                      alignItems: message.sender?.id === user.id ? 'flex-end' : 'flex-start',
                      p: 0,
                      mb: 1
                    }}
                  >
                                          <Paper
                        elevation={1}
                        sx={{
                          p: 2,
                          maxWidth: '70%',
                          bgcolor: message.sender?.id === user.id ? 'primary.main' : 'grey.100',
                          color: message.sender?.id === user.id ? 'white' : 'text.primary',
                          borderRadius: 2
                        }}
                      >
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Avatar
                          sx={{ 
                            width: 24, 
                            height: 24, 
                            mr: 1,
                            bgcolor: message.sender?.id === user.id ? 'primary.dark' : 'grey.300',
                            color: message.sender?.id === user.id ? 'white' : 'text.primary'
                          }}
                        >
                          {message.sender?.firstName?.charAt(0)?.toUpperCase()}
                        </Avatar>
                        <Typography variant="caption" sx={{ fontWeight: 500 }}>
                          {message.sender?.firstName} {message.sender?.lastName}
                        </Typography>
                        <Typography variant="caption" sx={{ ml: 1, opacity: 0.7 }}>
                          {formatTime(message.createdAt)}
                        </Typography>
                      </Box>
                      <Typography variant="body2">
                        {message.content}
                      </Typography>
                    </Paper>
                  </ListItem>
                ))}
                <div ref={messagesEndRef} />
              </List>
            )}
          </Box>

          {/* Message Input */}
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            <Box component="form" onSubmit={handleSendMessage} sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={sending}
                size="small"
                sx={{ flexGrow: 1 }}
              />
              <Button
                type="submit"
                variant="contained"
                disabled={sending || !newMessage.trim()}
                startIcon={sending ? <CircularProgress size={16} color="inherit" /> : <Send />}
                sx={{ minWidth: 'auto', px: 2 }}
              >
                {sending ? 'Sending...' : 'Send'}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default Chat; 