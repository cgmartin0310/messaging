const express = require('express');
const { body, validationResult } = require('express-validator');
const { Message, User, Conversation, ConversationParticipant } = require('../models');
const twilioService = require('../services/twilioService');
const { authenticateToken, isMessageOwner } = require('../middleware/auth');
const sequelize = require('../config/database');

const router = express.Router();

// Check if database is connected
const isDatabaseConnected = async () => {
  try {
    await sequelize.authenticate();
    return true;
  } catch (error) {
    return false;
  }
};

// Validation middleware
const validateMessage = [
  body('content')
    .isLength({ min: 1, max: 5000 })
    .withMessage('Message content must be between 1 and 5000 characters'),
  body('messageType')
    .optional()
    .isIn(['text', 'image', 'file', 'audio', 'video', 'location'])
    .withMessage('Invalid message type'),
  body('replyTo')
    .optional()
    .isUUID()
    .withMessage('Invalid reply message ID')
];

// Send message to conversation
router.post('/:conversationId', authenticateToken, validateMessage, async (req, res) => {
  try {
    // Check if database is connected
    if (!(await isDatabaseConnected())) {
      return res.status(503).json({
        error: 'Database unavailable',
        message: 'Database is not connected. Please try again later or contact support.'
      });
    }

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { conversationId } = req.params;
    const { content, messageType = 'text', replyTo, mediaUrl, mediaType, mediaSize } = req.body;
    const senderId = req.user.id;

    // Get conversation with participants
    const conversation = await Conversation.findByPk(conversationId, {
      include: [
        {
          model: ConversationParticipant,
          as: 'participants',
          attributes: ['identity', 'displayName', 'phoneNumber']
        }
      ]
    });

    if (!conversation) {
      return res.status(404).json({
        error: 'Conversation not found',
        message: 'The specified conversation does not exist'
      });
    }

    // Check if user is participant in this conversation
    const isParticipant = conversation.participants.some(p => p.identity === senderId);
    if (!isParticipant) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You must be a participant in this conversation to send messages'
      });
    }

    // Create message in database
    const message = await Message.create({
      senderId: senderId,
      conversationId: conversationId,
      content,
      messageType,
      mediaUrl,
      mediaType,
      mediaSize,
      replyToId: replyTo,
      isEncrypted: true,
      encryptionKey: twilioService.generateEncryptionKey()
    });

    // Get message with sender info
    const messageWithSender = await Message.findByPk(message.id, {
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['username', 'firstName', 'lastName', 'avatar']
        },
        {
          model: Message,
          as: 'replyTo',
          include: [
            {
              model: User,
              as: 'sender',
              attributes: ['username', 'firstName', 'lastName']
            }
          ]
        }
      ]
    });

    // Send SMS using virtual phone system
    let twilioMessageResult = { success: false };
    try {
      const virtualPhoneService = require('../services/virtualPhoneService');
      
      // Ensure sender has a virtual phone number
      const sender = await User.findByPk(senderId);
      if (!sender.virtualPhoneNumber) {
        console.log(`User ${sender.username} doesn't have a virtual number, assigning one...`);
        const virtualResult = await virtualPhoneService.assignVirtualNumber(senderId);
        if (!virtualResult.success) {
          console.error(`Failed to assign virtual number to user ${sender.username}: ${virtualResult.error}`);
          throw new Error('User must have a virtual phone number to send SMS messages');
        }
        console.log(`Assigned virtual number ${virtualResult.virtualNumber} to user ${sender.username}`);
      }
      
      // Get conversation participants
      const participants = await ConversationParticipant.findAll({
        where: { 
          ConversationId: conversationId,
          isActive: true
        }
      });

      // Send SMS to all participants except sender
      const smsPromises = participants
        .filter(p => p.identity !== senderId.toString())
        .map(async (participant) => {
          if (participant.participantType === 'virtual') {
            // Send to internal user via virtual phone
            return await virtualPhoneService.sendInternalSMS(
              senderId,
              participant.identity,
              content
            );
          } else if (participant.participantType === 'sms') {
            // Send to external SMS participant
            return await virtualPhoneService.sendExternalSMS(
              senderId,
              participant.phoneNumber,
              content
            );
          }
        });

      const smsResults = await Promise.all(smsPromises);
      
      // Check if any SMS was sent successfully
      const successfulSMS = smsResults.find(result => result && result.success);
      if (successfulSMS) {
        twilioMessageResult = {
          success: true,
          messageId: successfulSMS.messageId,
          status: 'sent'
        };
      }
    } catch (error) {
      console.error('SMS sending error:', error);
      twilioMessageResult = {
        success: false,
        error: error.message
      };
    }

    // Update message with Twilio results
    if (twilioMessageResult.success) {
      await message.update({
        twilioMessageId: twilioMessageResult.messageId,
        twilioStatus: 'sent'
      });
    } else {
      await message.update({
        twilioStatus: 'failed'
      });
    }

    // Emit to Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(`conversation-${conversationId}`).emit('new-message', {
        message: messageWithSender,
        twilioResult: twilioMessageResult
      });
    }

    res.status(201).json({
      message: 'Message sent successfully',
      messageData: messageWithSender,
      twilioResult: twilioMessageResult
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      error: 'Message sending failed',
      message: 'An error occurred while sending message'
    });
  }
});

// Get messages for a conversation
router.get('/:conversationId', authenticateToken, async (req, res) => {
  try {
    // Check if database is connected
    if (!(await isDatabaseConnected())) {
      return res.status(503).json({
        error: 'Database unavailable',
        message: 'Database is not connected. Please try again later or contact support.'
      });
    }

    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Check if user is participant in this conversation
    const conversation = await Conversation.findOne({
      where: { id: conversationId },
      include: [
        {
          model: ConversationParticipant,
          as: 'participants',
          where: { identity: req.user.id },
          required: true
        }
      ]
    });

    if (!conversation) {
      return res.status(404).json({
        error: 'Conversation not found or access denied',
        message: 'The specified conversation does not exist or you are not a participant'
      });
    }

    const messages = await Message.getConversationMessages(conversationId, parseInt(limit), skip);

    res.json({
      messages: messages.map(msg => msg.getMessageInfo()),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: messages.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    
    // Check if it's a database connection error
    if (error.name === 'SequelizeConnectionError' || error.name === 'SequelizeHostNotFoundError') {
      return res.status(503).json({
        error: 'Database unavailable',
        message: 'Database is not connected. Please try again later or contact support.'
      });
    }
    
    res.status(500).json({
      error: 'Messages retrieval failed',
      message: 'An error occurred while retrieving messages'
    });
  }
});

// Get message by ID
router.get('/message/:messageId', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findByPk(messageId, {
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['username', 'firstName', 'lastName', 'avatar']
        },
        {
          model: Message,
          as: 'replyTo',
          include: [
            {
              model: User,
              as: 'sender',
              attributes: ['username', 'firstName', 'lastName']
            }
          ]
        },
        {
          model: User,
          as: 'readBy',
          attributes: ['username', 'firstName', 'lastName']
        }
      ]
    });

    if (!message) {
      return res.status(404).json({
        error: 'Message not found',
        message: 'The specified message does not exist'
      });
    }

    // Check if user is member of the group
    const group = await Group.findByPk(message.groupId);
    if (!group || !group.isMember(req.user.id)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You must be a member of this group to view messages'
      });
    }

    res.json({
      message: message.getMessageInfo()
    });
  } catch (error) {
    console.error('Get message error:', error);
    res.status(500).json({
      error: 'Message retrieval failed',
      message: 'An error occurred while retrieving message'
    });
  }
});

// Mark message as read
router.post('/:messageId/read', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await Message.findByPk(messageId);
    if (!message) {
      return res.status(404).json({
        error: 'Message not found',
        message: 'The specified message does not exist'
      });
    }

    // Check if user is participant in the conversation
    const conversation = await Conversation.findOne({
      where: { id: message.conversationId },
      include: [
        {
          model: ConversationParticipant,
          as: 'participants',
          where: { identity: userId },
          required: true
        }
      ]
    });

    if (!conversation) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You must be a participant in this conversation to mark messages as read'
      });
    }

    await message.markAsRead(userId);

    res.json({
      message: 'Message marked as read'
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      error: 'Mark as read failed',
      message: 'An error occurred while marking message as read'
    });
  }
});

// Edit message
router.put('/:messageId', authenticateToken, isMessageOwner, [
  body('content')
    .isLength({ min: 1, max: 5000 })
    .withMessage('Message content must be between 1 and 5000 characters')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { content } = req.body;
    const message = req.message;

    await message.editMessage(content);

    // Emit to Socket.IO
    const io = req.app.get('io');
    io.to(`conversation-${message.conversationId}`).emit('message-edited', {
      messageId: message.id,
      content: message.content,
      editedAt: message.editedAt
    });

    res.json({
      message: 'Message edited successfully',
      messageData: message.getMessageInfo()
    });
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({
      error: 'Message edit failed',
      message: 'An error occurred while editing message'
    });
  }
});

// Delete message
router.delete('/:messageId', authenticateToken, isMessageOwner, async (req, res) => {
  try {
    const message = req.message;

    await message.softDelete();

    // Emit to Socket.IO
    const io = req.app.get('io');
    io.to(`conversation-${message.conversationId}`).emit('message-deleted', {
      messageId: message.id
    });

    res.json({
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      error: 'Message deletion failed',
      message: 'An error occurred while deleting message'
    });
  }
});

// Get unread message count for user
router.get('/unread/count', authenticateToken, async (req, res) => {
  try {
    // Check if database is connected
    if (!(await isDatabaseConnected())) {
      return res.status(503).json({
        error: 'Database unavailable',
        message: 'Database is not connected. Please try again later or contact support.'
      });
    }

    const userId = req.user.id;

    // Get user's conversations
    const userConversations = await Conversation.findAll({
      include: [
        {
          model: ConversationParticipant,
          as: 'participants',
          where: { identity: userId },
          required: true
        }
      ],
      where: { isActive: true }
    });

    const conversationIds = userConversations.map(conv => conv.id);

    // For now, return empty unread counts since we need to implement the Message model properly
    // This is a simplified version - in a real app, you'd count unread messages
    const unreadMap = {};
    conversationIds.forEach(conversationId => {
      unreadMap[conversationId] = 0; // Placeholder - implement actual unread counting
    });

    res.json({
      unreadCounts: unreadMap,
      totalUnread: 0
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    
    // Check if it's a database connection error
    if (error.name === 'SequelizeConnectionError' || error.name === 'SequelizeHostNotFoundError') {
      return res.status(503).json({
        error: 'Database unavailable',
        message: 'Database is not connected. Please try again later or contact support.'
      });
    }
    
    res.status(500).json({
      error: 'Unread count retrieval failed',
      message: 'An error occurred while retrieving unread count'
    });
  }
});

// Search messages in conversation
router.get('/:conversationId/search', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { q, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        error: 'Search query required',
        message: 'Please provide a search query with at least 2 characters'
      });
    }

    // Check if user is participant in this conversation
    const conversation = await Conversation.findOne({
      where: { id: conversationId },
      include: [
        {
          model: ConversationParticipant,
          as: 'participants',
          where: { identity: req.user.id },
          required: true
        }
      ]
    });

    if (!conversation) {
      return res.status(404).json({
        error: 'Conversation not found or access denied',
        message: 'The specified conversation does not exist or you are not a participant'
      });
    }

    const messages = await Message.findAll({
      where: {
        conversationId: conversationId,
        content: { [sequelize.Sequelize.Op.iLike]: `%${q.trim()}%` },
        isDeleted: false
      },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['username', 'firstName', 'lastName', 'avatar']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: skip
    });

    res.json({
      messages: messages.map(msg => msg.getMessageInfo()),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: messages.length
      }
    });
  } catch (error) {
    console.error('Search messages error:', error);
    res.status(500).json({
      error: 'Message search failed',
      message: 'An error occurred while searching messages'
    });
  }
});

module.exports = router; 