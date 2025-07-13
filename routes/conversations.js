const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { Conversation, ConversationParticipant, Message, User } = require('../models');

// Get all conversations for a user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const conversations = await Conversation.getUserConversations(req.user.id);
    
    const formattedConversations = conversations.map(conv => ({
      id: conv.id,
      name: conv.name,
      conversationType: conv.conversationType,
      lastMessageAt: conv.lastMessageAt,
      currentUserId: req.user.id,
      participants: conv.participants.map(p => ({
        id: p.id,
        participantType: p.participantType,
        identity: p.identity,
        phoneNumber: p.phoneNumber,
        displayName: p.displayName
      }))
    }));
    
    res.json(formattedConversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Create a new direct conversation with another user
router.post('/direct', authenticateToken, async (req, res) => {
  try {
    const { recipientId } = req.body;
    
    if (!recipientId) {
      return res.status(400).json({ error: 'Recipient ID is required' });
    }
    
    // Check if conversation already exists
    const existingConversation = await Conversation.findOne({
      include: [
        {
          model: ConversationParticipant,
          as: 'participants',
          where: { 
            identity: req.user.id,
            participantType: 'user'
          }
        },
        {
          model: ConversationParticipant,
          as: 'participants',
          where: { 
            identity: recipientId,
            participantType: 'user'
          }
        }
      ]
    });
    
    if (existingConversation) {
      return res.json({
        message: 'Conversation already exists',
        conversation: {
          id: existingConversation.id,
          name: existingConversation.name,
          conversationType: existingConversation.conversationType
        }
      });
    }
    
    // Create user-to-user conversation
    const recipient = await User.findByPk(recipientId);
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient user not found' });
    }
    
    const conversation = await Conversation.createUserToUserConversation(
      req.user.id,
      recipientId,
      recipient.firstName + ' ' + recipient.lastName
    );
    
    res.status(201).json({
      message: 'Direct conversation created successfully',
      conversation: {
        id: conversation.id,
        name: conversation.name,
        conversationType: conversation.conversationType,
        twilioConversationId: conversation.twilioConversationId
      }
    });
  } catch (error) {
    console.error('Error creating direct conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Create a new SMS conversation with external contact
router.post('/sms', authenticateToken, async (req, res) => {
  try {
    const { recipientPhoneNumber, recipientName } = req.body;
    
    if (!recipientPhoneNumber) {
      return res.status(400).json({ error: 'Recipient phone number is required' });
    }
    
    // Check if conversation already exists
    const existingConversation = await Conversation.findOne({
      include: [
        {
          model: ConversationParticipant,
          as: 'participants',
          where: { 
            identity: req.user.id,
            participantType: 'user'
          }
        },
        {
          model: ConversationParticipant,
          as: 'participants',
          where: { 
            phoneNumber: recipientPhoneNumber,
            participantType: 'sms'
          }
        }
      ]
    });
    
    if (existingConversation) {
      return res.json({
        message: 'SMS conversation already exists',
        conversation: {
          id: existingConversation.id,
          name: existingConversation.name,
          conversationType: existingConversation.conversationType
        }
      });
    }
    
    // Create user-to-SMS conversation
    const conversation = await Conversation.createDirectConversation(
      req.user.id,
      recipientPhoneNumber,
      recipientName
    );
    
    res.status(201).json({
      message: 'SMS conversation created successfully',
      conversation: {
        id: conversation.id,
        name: conversation.name,
        conversationType: conversation.conversationType,
        twilioConversationId: conversation.twilioConversationId
      }
    });
  } catch (error) {
    console.error('Error creating SMS conversation:', error);
    res.status(500).json({ error: 'Failed to create SMS conversation' });
  }
});

// Get messages for a conversation
router.get('/:conversationId/messages', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    // Check if user is participant in this conversation
    const conversation = await Conversation.findOne({
      where: { id: conversationId },
      include: [
        {
          model: ConversationParticipant,
          as: 'participants',
          where: { identity: req.user.id }
        }
      ]
    });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found or access denied' });
    }
    
    const messages = await conversation.getMessages(parseInt(limit), parseInt(offset));
    
    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      content: msg.content,
      messageType: msg.messageType,
      mediaUrl: msg.mediaUrl,
      mediaType: msg.mediaType,
      isEncrypted: msg.isEncrypted,
      twilioMessageId: msg.twilioMessageId,
      twilioStatus: msg.twilioStatus,
      isEdited: msg.isEdited,
      sender: msg.sender ? {
        id: msg.sender.id,
        username: msg.sender.username,
        firstName: msg.sender.firstName,
        lastName: msg.sender.lastName,
        avatar: msg.sender.avatar
      } : null,
      createdAt: msg.createdAt,
      updatedAt: msg.updatedAt
    }));
    
    res.json(formattedMessages);
  } catch (error) {
    console.error('Error fetching conversation messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send message to conversation
router.post('/:conversationId/messages', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content, messageType = 'text' } = req.body;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content is required' });
    }
    
    // Check if user is participant in this conversation
    const conversation = await Conversation.findOne({
      where: { id: conversationId },
      include: [
        {
          model: ConversationParticipant,
          as: 'participants',
          where: { identity: req.user.id }
        }
      ]
    });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found or access denied' });
    }
    
    // Add message to conversation
    const message = await conversation.addMessage(req.user.id, content, messageType);
    
    res.status(201).json({
      message: 'Message sent successfully',
      messageData: {
        id: message.id,
        content: message.content,
        messageType: message.messageType,
        twilioMessageId: message.twilioMessageId,
        twilioStatus: message.twilioStatus,
        sender: {
          id: req.user.id,
          username: req.user.username,
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          avatar: req.user.avatar
        },
        createdAt: message.createdAt
      }
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get conversation details
router.get('/:conversationId', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    const conversation = await Conversation.findOne({
      where: { id: conversationId },
      include: [
        {
          model: ConversationParticipant,
          as: 'participants'
        }
      ]
    });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Check if user is participant
    const isParticipant = conversation.participants.some(p => p.identity === req.user.id);
    if (!isParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({
      id: conversation.id,
      name: conversation.name,
      conversationType: conversation.conversationType,
      twilioConversationId: conversation.twilioConversationId,
      lastMessageAt: conversation.lastMessageAt,
      participants: conversation.participants.map(p => ({
        id: p.id,
        participantType: p.participantType,
        identity: p.identity,
        phoneNumber: p.phoneNumber,
        displayName: p.displayName,
        isActive: p.isActive,
        joinedAt: p.joinedAt
      })),
      createdAt: conversation.createdAt
    });
  } catch (error) {
    console.error('Error fetching conversation details:', error);
    res.status(500).json({ error: 'Failed to fetch conversation details' });
  }
});

// Delete a conversation (soft delete)
router.delete('/:conversationId', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    // Check if user is participant in this conversation
    const conversation = await Conversation.findOne({
      where: { id: conversationId },
      include: [
        {
          model: ConversationParticipant,
          as: 'participants',
          where: { identity: req.user.id }
        }
      ]
    });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found or access denied' });
    }
    
    // Soft delete the conversation
    await conversation.update({ isActive: false });
    
    // Also soft delete all participants
    await ConversationParticipant.update(
      { isActive: false },
      { where: { ConversationId: conversationId } }
    );
    
    res.json({
      success: true,
      message: 'Conversation deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// Handle incoming webhook from Twilio
router.post('/webhook', async (req, res) => {
  try {
    const { EventType, ConversationSid, MessageSid, Author, Body, Attributes } = req.body;
    
    if (EventType === 'onMessageAdded') {
      // Find conversation by Twilio conversation ID
      const conversation = await Conversation.findOne({
        where: { twilioConversationId: ConversationSid }
      });
      
      if (conversation) {
        // Parse attributes
        const attributes = JSON.parse(Attributes || '{}');
        
        // Find sender (could be user or SMS participant)
        let sender = null;
        if (Author !== req.user?.id) {
          // This is an incoming message from SMS
          const participant = await ConversationParticipant.findOne({
            where: { 
              ConversationId: conversation.id,
              identity: Author
            }
          });
          
          if (participant) {
            sender = {
              id: participant.identity,
              displayName: participant.displayName,
              phoneNumber: participant.phoneNumber
            };
          }
        }
        
        // Store message in database
        await Message.create({
          content: Body,
          messageType: attributes.messageType || 'text',
          senderId: sender?.id || Author,
          conversationId: conversation.id,
          twilioMessageId: MessageSid,
          twilioConversationId: ConversationSid,
          twilioStatus: 'delivered'
        });
        
        // Update conversation last message time
        await conversation.update({ lastMessageAt: new Date() });
      }
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error handling Twilio webhook:', error);
    res.status(500).send('Error');
  }
});

module.exports = router; 