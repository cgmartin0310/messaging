const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const { Group } = require('./Group');
const { Conversation } = require('./Conversation');

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: [1, 5000]
    }
  },
  messageType: {
    type: DataTypes.ENUM('text', 'image', 'file', 'audio', 'video', 'location'),
    defaultValue: 'text'
  },
  mediaUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  mediaType: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  mediaSize: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  isEncrypted: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  encryptionKey: {
    type: DataTypes.STRING,
    allowNull: true
  },
  twilioMessageId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  twilioConversationId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  conversationId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'conversations',
      key: 'id'
    }
  },
  twilioStatus: {
    type: DataTypes.ENUM('pending', 'sent', 'delivered', 'failed'),
    defaultValue: 'pending'
  },
  isEdited: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
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
  tableName: 'messages',
  timestamps: true
});

// Define the many-to-many relationship for message reads
const MessageRead = sequelize.define('MessageRead', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  readAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'message_reads',
  timestamps: true
});

// Associations are set up in models/index.js

// Static methods
Message.getGroupMessages = async function(groupId, limit = 50, offset = 0) {
  return await this.findAll({
    where: {
      groupId: groupId,
      isDeleted: false
    },
    include: [
      {
        model: User,
        as: 'sender',
        attributes: ['id', 'username', 'firstName', 'lastName', 'avatar']
      },
      {
        model: Message,
        as: 'replyTo',
        attributes: ['id', 'content'],
        include: [
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'username', 'firstName', 'lastName']
          }
        ]
      },
      {
        model: User,
        as: 'readBy',
        attributes: ['id', 'username', 'firstName', 'lastName'],
        through: { attributes: ['readAt'] }
      }
    ],
    order: [['createdAt', 'DESC']],
    limit: limit,
    offset: offset
  });
};

// Instance methods
Message.prototype.markAsRead = async function(userId) {
  const existingRead = await MessageRead.findOne({
    where: {
      MessageId: this.id,
      UserId: userId
    }
  });

  if (!existingRead) {
    await MessageRead.create({
      MessageId: this.id,
      UserId: userId,
      readAt: new Date()
    });
  }

  return this;
};

Message.prototype.getMessageInfo = function() {
  return {
    id: this.id,
    content: this.content,
    messageType: this.messageType,
    mediaUrl: this.mediaUrl,
    mediaType: this.mediaType,
    mediaSize: this.mediaSize,
    isEncrypted: this.isEncrypted,
    twilioMessageId: this.twilioMessageId,
    twilioConversationId: this.twilioConversationId,
    twilioStatus: this.twilioStatus,
    isEdited: this.isEdited,
    isDeleted: this.isDeleted,
    sender: this.sender ? {
      id: this.sender.id,
      username: this.sender.username,
      firstName: this.sender.firstName,
      lastName: this.sender.lastName,
      avatar: this.sender.avatar
    } : null,
    replyTo: this.replyTo ? {
      id: this.replyTo.id,
      content: this.replyTo.content,
      sender: this.replyTo.sender ? {
        id: this.replyTo.sender.id,
        username: this.replyTo.sender.username,
        firstName: this.replyTo.sender.firstName,
        lastName: this.replyTo.sender.lastName
      } : null
    } : null,
    readBy: this.readBy ? this.readBy.map(user => ({
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      readAt: user.MessageRead.readAt
    })) : [],
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = { Message, MessageRead }; 