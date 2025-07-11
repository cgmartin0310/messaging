const express = require('express');
const { body, validationResult } = require('express-validator');
const { Message } = require('../models/Message');
const { Group } = require('../models/Group');
const User = require('../models/User');
const twilioService = require('../services/twilioService');
const { isGroupMember, isMessageOwner } = require('../middleware/auth');
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
    .isMongoId()
    .withMessage('Invalid reply message ID')
];

// Send message to group
router.post('/:groupId', isGroupMember, validateMessage, async (req, res) => {
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

    const { groupId } = req.params;
    const { content, messageType = 'text', replyTo, mediaUrl, mediaType, mediaSize } = req.body;
    const senderId = req.user._id;

    // Get group with members
    const group = await Group.findById(groupId)
      .populate('members.user', 'phoneNumber username firstName lastName');

    if (!group) {
      return res.status(404).json({
        error: 'Group not found',
        message: 'The specified group does not exist'
      });
    }

    // Create or get Twilio conversation for this group
    const conversationName = `group-${groupId}`;
    const conversationResult = await twilioService.createOrGetConversation(
      conversationName,
      group.name
    );

    if (!conversationResult.success) {
      console.error('Failed to create conversation:', conversationResult.error);
    }

    // Create message in database
    const message = new Message({
      sender: senderId,
      group: groupId,
      content,
      messageType,
      mediaUrl,
      mediaType,
      mediaSize,
      replyTo,
      isEncrypted: true,
      encryptionKey: twilioService.generateEncryptionKey(),
      twilioConversationId: conversationResult.conversationId
    });

    await message.save();

    // Populate sender info
    await message.populate('sender', 'username firstName lastName avatar');
    if (replyTo) {
      await message.populate('replyTo', 'content sender');
    }

    // Send message to Twilio conversation
    let twilioMessageResult = { success: false };
    if (conversationResult.success) {
      const author = `${req.user.firstName} ${req.user.lastName}`.trim();
      twilioMessageResult = await twilioService.sendMessage(
        conversationResult.conversationId,
        author,
        content,
        {
          messageId: message._id.toString(),
          groupId: groupId,
          messageType: messageType,
          senderId: senderId.toString()
        }
      );
    }

    // Update message with Twilio results
    if (twilioMessageResult.success) {
      message.twilioMessageId = twilioMessageResult.messageId;
      message.twilioStatus = 'sent';
    } else {
      message.twilioStatus = 'failed';
    }
    await message.save();

    // Emit to Socket.IO
    const io = req.app.get('io');
    io.to(`group-${groupId}`).emit('new-message', {
      message: message.getMessageInfo(),
      twilioResult: twilioMessageResult
    });

    res.status(201).json({
      message: 'Message sent successfully',
      messageData: message.getMessageInfo(),
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

// Get messages for a group
router.get('/:groupId', isGroupMember, async (req, res) => {
  try {
    // Check if database is connected
    if (!(await isDatabaseConnected())) {
      return res.status(503).json({
        error: 'Database unavailable',
        message: 'Database is not connected. Please try again later or contact support.'
      });
    }

    const { groupId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const messages = await Message.getGroupMessages(groupId, parseInt(limit), skip);

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
router.get('/message/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId)
      .populate('sender', 'username firstName lastName avatar')
      .populate('replyTo', 'content sender')
      .populate('readBy.user', 'username firstName lastName');

    if (!message) {
      return res.status(404).json({
        error: 'Message not found',
        message: 'The specified message does not exist'
      });
    }

    // Check if user is member of the group
    const group = await Group.findById(message.group);
    if (!group.isMember(req.user._id)) {
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
router.post('/:messageId/read', async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        error: 'Message not found',
        message: 'The specified message does not exist'
      });
    }

    // Check if user is member of the group
    const group = await Group.findById(message.group);
    if (!group.isMember(userId)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You must be a member of this group to mark messages as read'
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
router.put('/:messageId', isMessageOwner, [
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
    io.to(`group-${message.group}`).emit('message-edited', {
      messageId: message._id,
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
router.delete('/:messageId', isMessageOwner, async (req, res) => {
  try {
    const message = req.message;

    await message.softDelete();

    // Emit to Socket.IO
    const io = req.app.get('io');
    io.to(`group-${message.group}`).emit('message-deleted', {
      messageId: message._id
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
router.get('/unread/count', async (req, res) => {
  try {
    const userId = req.user._id;

    // Get user's groups
    const userGroups = await Group.find({
      'members.user': userId,
      isActive: true
    });

    const groupIds = userGroups.map(group => group._id);

    // Count unread messages
    const unreadCounts = await Message.aggregate([
      {
        $match: {
          group: { $in: groupIds },
          isDeleted: false,
          sender: { $ne: userId }
        }
      },
      {
        $lookup: {
          from: 'messages',
          localField: '_id',
          foreignField: 'readBy.user',
          as: 'readByUser'
        }
      },
      {
        $match: {
          'readByUser': { $size: 0 }
        }
      },
      {
        $group: {
          _id: '$group',
          count: { $sum: 1 }
        }
      }
    ]);

    const unreadMap = {};
    unreadCounts.forEach(item => {
      unreadMap[item._id.toString()] = item.count;
    });

    res.json({
      unreadCounts: unreadMap,
      totalUnread: unreadCounts.reduce((sum, item) => sum + item.count, 0)
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      error: 'Unread count retrieval failed',
      message: 'An error occurred while retrieving unread count'
    });
  }
});

// Search messages in group
router.get('/:groupId/search', isGroupMember, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { q, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        error: 'Search query required',
        message: 'Please provide a search query with at least 2 characters'
      });
    }

    const searchRegex = new RegExp(q.trim(), 'i');

    const messages = await Message.find({
      group: groupId,
      content: searchRegex,
      isDeleted: false
    })
    .populate('sender', 'username firstName lastName avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

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