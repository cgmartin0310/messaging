const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Contact = require('./Contact'); // Added for Consent checks
const Consent = require('./Consent'); // Added for Consent checks

const Conversation = sequelize.define('Conversation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  conversationType: {
    type: DataTypes.ENUM('direct', 'group', 'sms'),
    defaultValue: 'direct'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  isPrivate: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  maxParticipants: {
    type: DataTypes.INTEGER,
    defaultValue: 50
  },
  lastMessageAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  patientId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
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

const ConversationParticipant = sequelize.define('ConversationParticipant', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  ConversationId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'conversations',
      key: 'id'
    }
  },
  participantType: {
    type: DataTypes.ENUM('user', 'sms', 'virtual'),
    defaultValue: 'user'
  },
  identity: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'User ID for internal users, phone number for SMS participants, virtual number for virtual participants'
  },
  phoneNumber: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Phone number for SMS participants or virtual number for internal users'
  },
  displayName: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  role: {
    type: DataTypes.ENUM('admin', 'member'),
    defaultValue: 'member'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  joinedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  leftAt: {
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
  tableName: 'conversation_participants',
  timestamps: true
});

// Static methods
Conversation.createDirectConversation = async function(userId, recipientId, recipientName = null) {
  const twilioService = require('../services/twilioService');
  const virtualPhoneService = require('../services/virtualPhoneService');
  
  // Get both users
  const [user, recipient] = await Promise.all([
    User.findByPk(userId),
    User.findByPk(recipientId)
  ]);
  
  if (!user || !recipient) {
    throw new Error('One or both users not found');
  }
  
  // Ensure both users have virtual numbers
  const [userVirtualResult, recipientVirtualResult] = await Promise.all([
    virtualPhoneService.assignVirtualNumber(userId),
    virtualPhoneService.assignVirtualNumber(recipientId)
  ]);
  
  if (!userVirtualResult.success || !recipientVirtualResult.success) {
    throw new Error('Failed to assign virtual numbers to users');
  }
  
  // Create conversation
  const conversation = await this.create({
    name: `Direct: ${user.firstName} & ${recipient.firstName}`,
    conversationType: 'direct',
    isActive: true
  });
  
  // Add participants
  await Promise.all([
    ConversationParticipant.create({
      ConversationId: conversation.id,
      participantType: 'virtual',
      identity: user.id,
      phoneNumber: userVirtualResult.virtualNumber,
      displayName: `${user.firstName} ${user.lastName}`,
      role: 'member'
    }),
    ConversationParticipant.create({
      ConversationId: conversation.id,
      participantType: 'virtual',
      identity: recipient.id,
      phoneNumber: recipientVirtualResult.virtualNumber,
      displayName: `${recipient.firstName} ${recipient.lastName}`,
      role: 'member'
    })
  ]);
  
  return conversation;
};

Conversation.createSMSConversation = async function(userId, externalPhoneNumber, recipientName = null) {
  const virtualPhoneService = require('../services/virtualPhoneService');
  
  // Get user
  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error('User not found');
  }
  
  // Ensure user has virtual number
  const userVirtualResult = await virtualPhoneService.assignVirtualNumber(userId);
  if (!userVirtualResult.success) {
    throw new Error('Failed to assign virtual number to user');
  }
  
  // Normalize phone numbers - ensure they have + prefix
  const normalizedExternalPhone = externalPhoneNumber.startsWith('+') 
    ? externalPhoneNumber 
    : `+${externalPhoneNumber}`;
  
  const normalizedVirtualPhone = userVirtualResult.virtualNumber.startsWith('+')
    ? userVirtualResult.virtualNumber
    : `+${userVirtualResult.virtualNumber}`;
  
  // Create conversation
  const conversation = await this.create({
    name: `SMS: ${user.firstName} & ${recipientName || normalizedExternalPhone}`,
    conversationType: 'sms',
    isActive: true
  });
  
  // Add participants
  await Promise.all([
    ConversationParticipant.create({
      ConversationId: conversation.id,
      participantType: 'virtual',
      identity: user.id,
      phoneNumber: normalizedVirtualPhone,
      displayName: `${user.firstName} ${user.lastName}`,
      role: 'member'
    }),
    ConversationParticipant.create({
      ConversationId: conversation.id,
      participantType: 'sms',
      identity: externalPhoneNumber, // Keep original for backward compatibility
      phoneNumber: normalizedExternalPhone,
      displayName: recipientName || normalizedExternalPhone,
      role: 'member'
    })
  ]);
  
  return conversation;
};

Conversation.createGroupConversation = async function(creatorId, name, description = null, participants = [], patientId = null) {
  const virtualPhoneService = require('../services/virtualPhoneService');
  
  // Get creator
  const creator = await User.findByPk(creatorId);
  if (!creator) {
    throw new Error('Creator not found');
  }
  
  // Ensure creator has virtual number
  const creatorVirtualResult = await virtualPhoneService.assignVirtualNumber(creatorId);
  if (!creatorVirtualResult.success) {
    throw new Error('Failed to assign virtual number to creator');
  }
  
  // Create conversation
  const conversation = await this.create({
    name: name,
    description: description,
    conversationType: 'group',
    isActive: true,
    patientId: patientId
  });
  
  // Add creator as admin
  await ConversationParticipant.create({
    ConversationId: conversation.id,
    participantType: 'virtual',
    identity: creator.id,
    phoneNumber: creatorVirtualResult.virtualNumber,
    displayName: `${creator.firstName} ${creator.lastName}`,
    role: 'admin'
  });
  
  // Add other participants
  for (const participantId of participants) {
    if (participantId !== creatorId) {
      const participant = await User.findByPk(participantId);
      if (participant) {
        const participantVirtualResult = await virtualPhoneService.assignVirtualNumber(participantId);
        if (participantVirtualResult.success) {
          await ConversationParticipant.create({
            ConversationId: conversation.id,
            participantType: 'virtual',
            identity: participant.id,
            phoneNumber: participantVirtualResult.virtualNumber,
            displayName: `${participant.firstName} ${participant.lastName}`,
            role: 'member'
          });
        }
      }
    }
  }
  
  return conversation;
};

// Instance methods
Conversation.prototype.addParticipant = async function(participantId, participantType = 'virtual', displayName = null) {
  const virtualPhoneService = require('../services/virtualPhoneService');
  const Consent = require('./Consent');
  
  if (this.patientId) {
    let hasConsent = false;
    if (participantType === 'virtual' || participantType === 'user') {
      // Check consent for internal user's contact (assuming user has associated contact)
      const contact = await Contact.findOne({ where: { userId: participantId } });
      if (contact) {
        const consent = await Consent.findOne({
          where: { contactId: contact.id, patientId: this.patientId, consentGiven: true }
        });
        hasConsent = !!consent;
      }
    } else if (participantType === 'sms') {
      const contact = await Contact.findOne({ where: { phoneNumber: participantId } });
      if (contact) {
        const consent = await Consent.findOne({
          where: { contactId: contact.id, patientId: this.patientId, consentGiven: true }
        });
        hasConsent = !!consent;
      }
    } // Add for group if needed
    if (!hasConsent) {
      throw new Error('No consent on file for this participant and patient');
    }
  }
  
  if (participantType === 'virtual') {
    // Add internal user
    const user = await User.findByPk(participantId);
    if (!user) {
      throw new Error('User not found');
    }
    
    const virtualResult = await virtualPhoneService.assignVirtualNumber(participantId);
    if (!virtualResult.success) {
      throw new Error('Failed to assign virtual number to user');
    }
    
    await ConversationParticipant.create({
      ConversationId: this.id,
      participantType: 'virtual',
      identity: participantId,
      phoneNumber: virtualResult.virtualNumber,
      displayName: displayName || `${user.firstName} ${user.lastName}`,
      role: 'member'
    });
    
    return {
      success: true,
      participantId: participantId,
      virtualNumber: virtualResult.virtualNumber
    };
  } else if (participantType === 'sms') {
    // Add external SMS participant
    await ConversationParticipant.create({
      ConversationId: this.id,
      participantType: 'sms',
      identity: participantId, // This is the phone number
      phoneNumber: participantId,
      displayName: displayName || participantId,
      role: 'member'
    });
    
    return {
      success: true,
      participantId: participantId,
      phoneNumber: participantId
    };
  }
  
  throw new Error('Invalid participant type');
};

Conversation.prototype.removeParticipant = async function(participantId) {
  const participant = await ConversationParticipant.findOne({
    where: {
      ConversationId: this.id,
      identity: participantId
    }
  });
  
  if (!participant) {
    throw new Error('Participant not found in conversation');
  }
  
  // Mark as left instead of deleting to preserve history
  await participant.update({
    isActive: false,
    leftAt: new Date()
  });
  
  return {
    success: true,
    participantId: participantId,
    message: 'Participant removed from conversation'
  };
};

Conversation.prototype.getParticipants = async function() {
  return await ConversationParticipant.findAll({
    where: {
      ConversationId: this.id,
      isActive: true
    },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'firstName', 'lastName', 'avatar'],
        required: false
      }
    ],
    order: [['joinedAt', 'ASC']]
  });
};

Conversation.prototype.sendMessage = async function(senderId, content, messageType = 'text') {
  const virtualPhoneService = require('../services/virtualPhoneService');
  const { Message } = require('./Message');
  
  // Get sender
  const sender = await User.findByPk(senderId);
  if (!sender) {
    throw new Error('Sender not found');
  }
  
  // Get conversation participants
  const participants = await this.getParticipants();
  
  // Send SMS to all participants except sender
  const smsPromises = participants
    .filter(p => p.identity !== senderId.toString())
    .map(async (participant) => {
      if (participant.participantType === 'virtual') {
        // Send to internal user
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
  
  // Store message in database
  const message = await Message.create({
    content: content,
    messageType: messageType,
    senderId: senderId,
    conversationId: this.id,
    twilioStatus: 'sent'
  });
  
  // Update conversation last message time
  await this.update({ lastMessageAt: new Date() });
  
  return {
    message: message,
    smsResults: smsResults
  };
};

module.exports = { Conversation, ConversationParticipant }; 