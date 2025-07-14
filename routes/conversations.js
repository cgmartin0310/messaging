const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { Conversation, ConversationParticipant, User } = require('../models');
const virtualPhoneService = require('../services/virtualPhoneService');

// Get all conversations for current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const conversations = await Conversation.findAll({
      include: [
        {
          model: ConversationParticipant,
          as: 'participants',
          where: { 
            identity: req.user.id,
            isActive: true
          },
          required: true
        }
      ],
      where: { isActive: true },
      order: [['lastMessageAt', 'DESC']]
    });
    
    res.json({
      conversations: conversations.map(conv => ({
        id: conv.id,
        name: conv.name,
        description: conv.description,
        conversationType: conv.conversationType,
        lastMessageAt: conv.lastMessageAt,
        createdAt: conv.createdAt
      }))
    });
  } catch (error) {
    console.error('Error getting conversations:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

// Create direct conversation with another user
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
            isActive: true
          }
        },
        {
          model: ConversationParticipant,
          as: 'participants',
          where: { 
            identity: recipientId,
            isActive: true
          }
        }
      ],
      where: { 
        conversationType: 'direct',
        isActive: true
      }
    });
    
    if (existingConversation) {
      return res.json({
        message: 'Direct conversation already exists',
        conversation: {
          id: existingConversation.id,
          name: existingConversation.name,
          conversationType: existingConversation.conversationType
        }
      });
    }
    
    // Create new direct conversation
    const conversation = await Conversation.createDirectConversation(
      req.user.id,
      recipientId
    );
    
    res.status(201).json({
      message: 'Direct conversation created successfully',
      conversation: {
        id: conversation.id,
        name: conversation.name,
        conversationType: conversation.conversationType
      }
    });
  } catch (error) {
    console.error('Error creating direct conversation:', error);
    res.status(500).json({ error: 'Failed to create direct conversation' });
  }
});

// Create SMS conversation with external contact
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
            isActive: true
          }
        },
        {
          model: ConversationParticipant,
          as: 'participants',
          where: { 
            phoneNumber: recipientPhoneNumber,
            isActive: true
          }
        }
      ],
      where: { 
        conversationType: 'sms',
        isActive: true
      }
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
    
    // Create new SMS conversation
    const conversation = await Conversation.createSMSConversation(
      req.user.id,
      recipientPhoneNumber,
      recipientName
    );
    
    res.status(201).json({
      message: 'SMS conversation created successfully',
      conversation: {
        id: conversation.id,
        name: conversation.name,
        conversationType: conversation.conversationType
      }
    });
  } catch (error) {
    console.error('Error creating SMS conversation:', error);
    res.status(500).json({ error: 'Failed to create SMS conversation' });
  }
});

// Create group conversation
router.post('/group', authenticateToken, async (req, res) => {
  try {
    const { name, description, participants } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Group name is required' });
    }
    
    // Create new group conversation
    const conversation = await Conversation.createGroupConversation(
      req.user.id,
      name,
      description,
      participants || []
    );
    
    res.status(201).json({
      message: 'Group conversation created successfully',
      conversation: {
        id: conversation.id,
        name: conversation.name,
        conversationType: conversation.conversationType,
        description: conversation.description
      }
    });
  } catch (error) {
    console.error('Error creating group conversation:', error);
    res.status(500).json({ error: 'Failed to create group conversation' });
  }
});

// Get conversation details with participants
router.get('/:conversationId', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    const conversation = await Conversation.findByPk(conversationId, {
      include: [
        {
          model: ConversationParticipant,
          as: 'participants',
          where: { isActive: true }
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
      conversation: {
        id: conversation.id,
        name: conversation.name,
        description: conversation.description,
        conversationType: conversation.conversationType,
        lastMessageAt: conversation.lastMessageAt,
        createdAt: conversation.createdAt,
        participants: conversation.participants.map(p => ({
          id: p.id,
          participantType: p.participantType,
          identity: p.identity,
          phoneNumber: p.phoneNumber,
          displayName: p.displayName,
          role: p.role,
          joinedAt: p.joinedAt
        }))
      }
    });
  } catch (error) {
    console.error('Error getting conversation:', error);
    res.status(500).json({ error: 'Failed to get conversation' });
  }
});

// Add participant to conversation
router.post('/:conversationId/participants', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { participantId, participantType, displayName } = req.body;
    
    if (!participantId || !participantType) {
      return res.status(400).json({ error: 'Participant ID and type are required' });
    }
    
    const conversation = await Conversation.findByPk(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Check if user is admin or creator
    const userParticipant = await ConversationParticipant.findOne({
      where: {
        ConversationId: conversationId,
        identity: req.user.id,
        isActive: true
      }
    });
    
    if (!userParticipant || userParticipant.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can add participants' });
    }
    
    // Check if participant already exists
    const existingParticipant = await ConversationParticipant.findOne({
      where: {
        ConversationId: conversationId,
        identity: participantId,
        isActive: true
      }
    });
    
    if (existingParticipant) {
      return res.status(400).json({ error: 'Participant already in conversation' });
    }
    
    // Add participant
    const result = await conversation.addParticipant(participantId, participantType, displayName);
    
    res.json({
      message: 'Participant added successfully',
      participant: {
        participantId: result.participantId,
        participantType: participantType,
        displayName: displayName
      }
    });
  } catch (error) {
    console.error('Error adding participant:', error);
    res.status(500).json({ error: 'Failed to add participant' });
  }
});

// Remove participant from conversation
router.delete('/:conversationId/participants/:participantId', authenticateToken, async (req, res) => {
  try {
    const { conversationId, participantId } = req.params;
    
    const conversation = await Conversation.findByPk(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Check if user is admin or removing themselves
    const userParticipant = await ConversationParticipant.findOne({
      where: {
        ConversationId: conversationId,
        identity: req.user.id,
        isActive: true
      }
    });
    
    if (!userParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (userParticipant.role !== 'admin' && req.user.id !== participantId) {
      return res.status(403).json({ error: 'Only admins can remove other participants' });
    }
    
    // Remove participant
    const result = await conversation.removeParticipant(participantId);
    
    res.json({
      message: result.message,
      participantId: result.participantId
    });
  } catch (error) {
    console.error('Error removing participant:', error);
    res.status(500).json({ error: 'Failed to remove participant' });
  }
});

// Get conversation participants
router.get('/:conversationId/participants', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    const conversation = await Conversation.findByPk(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Check if user is participant
    const userParticipant = await ConversationParticipant.findOne({
      where: {
        ConversationId: conversationId,
        identity: req.user.id,
        isActive: true
      }
    });
    
    if (!userParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const participants = await conversation.getParticipants();
    
    res.json({
      participants: participants.map(p => ({
        id: p.id,
        participantType: p.participantType,
        identity: p.identity,
        phoneNumber: p.phoneNumber,
        displayName: p.displayName,
        role: p.role,
        joinedAt: p.joinedAt,
        user: p.user ? {
          id: p.user.id,
          username: p.user.username,
          firstName: p.user.firstName,
          lastName: p.user.lastName,
          avatar: p.user.avatar
        } : null
      }))
    });
  } catch (error) {
    console.error('Error getting participants:', error);
    res.status(500).json({ error: 'Failed to get participants' });
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
    
    const conversation = await Conversation.findByPk(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Check if user is participant
    const userParticipant = await ConversationParticipant.findOne({
      where: {
        ConversationId: conversationId,
        identity: req.user.id,
        isActive: true
      }
    });
    
    if (!userParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Send message
    const result = await conversation.sendMessage(req.user.id, content.trim(), messageType);
    
    res.status(201).json({
      message: 'Message sent successfully',
      messageData: {
        id: result.message.id,
        content: result.message.content,
        messageType: result.message.messageType,
        senderId: req.user.id,
        conversationId: conversationId,
        createdAt: result.message.createdAt
      },
      smsResults: result.smsResults
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

module.exports = router; 