const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const Conversation = sequelize.define('Conversation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  twilioConversationId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  conversationType: {
    type: DataTypes.ENUM('direct', 'group'),
    defaultValue: 'direct'
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  lastMessageAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'conversations',
  timestamps: true
});

// Conversation Participant model for omni-channel participants
const ConversationParticipant = sequelize.define('ConversationParticipant', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  participantType: {
    type: DataTypes.ENUM('user', 'sms', 'whatsapp'),
    defaultValue: 'user'
  },
  twilioParticipantId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  identity: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  displayName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  joinedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'conversation_participants',
  timestamps: true
});

// Static methods
Conversation.createUserToUserConversation = async function(userId, recipientId, recipientName = null) {
  const twilioService = require('../services/twilioService');
  
  // Create unique conversation name
  const conversationName = `direct_${userId}_${recipientId}`;
  
  // Create Twilio conversation
  const twilioResult = await twilioService.createOrGetConversation(
    conversationName,
    `Direct: ${recipientName || 'User'}`
  );
  
  if (!twilioResult.success) {
    throw new Error(`Failed to create Twilio conversation: ${twilioResult.error}`);
  }
  
  // Check if conversation already exists in database
  let conversation = await this.findOne({
    where: { twilioConversationId: twilioResult.conversationId }
  });
  
  if (!conversation) {
    // Create conversation in database
    conversation = await this.create({
      twilioConversationId: twilioResult.conversationId,
      conversationType: 'direct',
      name: recipientName || 'Direct Chat'
    });
  }
  
  // Add current user as participant
  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error('User not found');
  }
  
  const userParticipant = await twilioService.addParticipant(
    twilioResult.conversationId,
    user.id,
    {
      displayName: `${user.firstName} ${user.lastName}`,
      phoneNumber: user.phoneNumber
    }
  );
  
  if (userParticipant.success) {
    // Check if participant already exists
    const existingUserParticipant = await ConversationParticipant.findOne({
      where: { 
        ConversationId: conversation.id,
        identity: user.id
      }
    });
    
    if (!existingUserParticipant) {
      await ConversationParticipant.create({
        ConversationId: conversation.id,
        participantType: 'user',
        twilioParticipantId: userParticipant.participantId,
        identity: user.id,
        phoneNumber: user.phoneNumber,
        displayName: `${user.firstName} ${user.lastName}`
      });
    }
  }
  
  // Add recipient user as participant
  const recipient = await User.findByPk(recipientId);
  if (!recipient) {
    throw new Error('Recipient user not found');
  }
  
  const recipientParticipant = await twilioService.addParticipant(
    twilioResult.conversationId,
    recipient.id,
    {
      displayName: `${recipient.firstName} ${recipient.lastName}`,
      phoneNumber: recipient.phoneNumber
    }
  );
  
  if (recipientParticipant.success) {
    // Check if participant already exists
    const existingRecipientParticipant = await ConversationParticipant.findOne({
      where: { 
        ConversationId: conversation.id,
        identity: recipient.id
      }
    });
    
    if (!existingRecipientParticipant) {
      await ConversationParticipant.create({
        ConversationId: conversation.id,
        participantType: 'user',
        twilioParticipantId: recipientParticipant.participantId,
        identity: recipient.id,
        phoneNumber: recipient.phoneNumber,
        displayName: `${recipient.firstName} ${recipient.lastName}`
      });
    }
  }
  
  return conversation;
};

Conversation.createDirectConversation = async function(userId, recipientPhoneNumber, recipientName = null) {
  const twilioService = require('../services/twilioService');
  
  // Create unique conversation name
  const conversationName = `direct_${userId}_${recipientPhoneNumber.replace(/[^0-9]/g, '')}`;
  
  // Create Twilio conversation
  const twilioResult = await twilioService.createOrGetConversation(
    conversationName,
    `Direct: ${recipientName || recipientPhoneNumber}`
  );
  
  if (!twilioResult.success) {
    throw new Error(`Failed to create Twilio conversation: ${twilioResult.error}`);
  }
  
  // Check if conversation already exists in database
  let conversation = await this.findOne({
    where: { twilioConversationId: twilioResult.conversationId }
  });
  
  if (!conversation) {
    // Create conversation in database
    conversation = await this.create({
      twilioConversationId: twilioResult.conversationId,
      conversationType: 'direct',
      name: recipientName || recipientPhoneNumber
    });
  }
  
  // Add Goldie app user as participant
  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error('User not found');
  }
  
  const userParticipant = await twilioService.addParticipant(
    twilioResult.conversationId,
    user.id,
    {
      displayName: `${user.firstName} ${user.lastName}`,
      phoneNumber: user.phoneNumber
    }
  );
  
  if (userParticipant.success) {
    // Check if participant already exists
    const existingUserParticipant = await ConversationParticipant.findOne({
      where: { 
        ConversationId: conversation.id,
        identity: user.id
      }
    });
    
    if (!existingUserParticipant) {
      await ConversationParticipant.create({
        ConversationId: conversation.id,
        participantType: 'user',
        twilioParticipantId: userParticipant.participantId,
        identity: user.id,
        phoneNumber: user.phoneNumber,
        displayName: `${user.firstName} ${user.lastName}`
      });
    }
  }
  
  // Add SMS recipient as participant
  const smsParticipant = await twilioService.addParticipant(
    twilioResult.conversationId,
    recipientPhoneNumber,
    {
      displayName: recipientName || recipientPhoneNumber,
      phoneNumber: recipientPhoneNumber
    }
  );
  
  if (smsParticipant.success) {
    // Check if participant already exists
    const existingSmsParticipant = await ConversationParticipant.findOne({
      where: { 
        ConversationId: conversation.id,
        identity: recipientPhoneNumber
      }
    });
    
    if (!existingSmsParticipant) {
      await ConversationParticipant.create({
        ConversationId: conversation.id,
        participantType: 'sms',
        twilioParticipantId: smsParticipant.participantId,
        identity: recipientPhoneNumber,
        phoneNumber: recipientPhoneNumber,
        displayName: recipientName || recipientPhoneNumber
      });
    }
  }
  
  return conversation;
};

Conversation.getUserConversations = async function(userId) {
  return await this.findAll({
    include: [
      {
        model: ConversationParticipant,
        as: 'participants',
        where: { identity: userId },
        required: true
      }
    ],
    where: { isActive: true },
    order: [['lastMessageAt', 'DESC']]
  });
};

// Instance methods
Conversation.prototype.addMessage = async function(senderId, content, messageType = 'text') {
  const { Message } = require('./Message');
  const twilioService = require('../services/twilioService');
  
  // Send message to Twilio conversation
  const sender = await User.findByPk(senderId);
  const twilioResult = await twilioService.sendMessage(
    this.twilioConversationId,
    sender.id,
    content,
    {
      messageType: messageType,
      senderName: `${sender.firstName} ${sender.lastName}`
    }
  );
  
  if (!twilioResult.success) {
    throw new Error(`Failed to send message to Twilio: ${twilioResult.error}`);
  }
  
  // Store message in database
  const message = await Message.create({
    content: content,
    messageType: messageType,
    senderId: senderId,
    conversationId: this.id,
    twilioMessageId: twilioResult.messageId,
    twilioConversationId: this.twilioConversationId
  });
  
  // Update conversation last message time
  await this.update({ lastMessageAt: new Date() });
  
  return message;
};

Conversation.prototype.getMessages = async function(limit = 50, offset = 0) {
  const { Message } = require('./Message');
  
  return await Message.findAll({
    where: {
      conversationId: this.id,
      isDeleted: false
    },
    include: [
      {
        model: User,
        as: 'sender',
        attributes: ['id', 'username', 'firstName', 'lastName', 'avatar']
      }
    ],
    order: [['createdAt', 'DESC']],
    limit: limit,
    offset: offset
  });
};

module.exports = { Conversation, ConversationParticipant }; 