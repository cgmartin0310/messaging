const sequelize = require('../config/database');

// Import models
const User = require('./User');
const { Group, GroupMember } = require('./Group');
const { Message, MessageRead } = require('./Message');
const { Conversation, ConversationParticipant } = require('./Conversation');

// Set up associations in the correct order
// First, set up the many-to-many relationship between Users and Groups
Group.belongsToMany(User, { 
  through: GroupMember, 
  as: 'members',
  foreignKey: 'GroupId',
  otherKey: 'UserId'
});
User.belongsToMany(Group, { 
  through: GroupMember, 
  as: 'groups',
  foreignKey: 'UserId',
  otherKey: 'GroupId'
});

// Set up Message associations
Message.belongsTo(User, { 
  as: 'sender', 
  foreignKey: 'senderId' 
});
Message.belongsTo(Group, { 
  as: 'group', 
  foreignKey: 'groupId' 
});
Message.belongsTo(Conversation, { 
  as: 'conversation', 
  foreignKey: 'conversationId' 
});
Message.belongsTo(Message, { 
  as: 'replyTo', 
  foreignKey: 'replyToId' 
});

// Set up the many-to-many relationship for message reads
Message.belongsToMany(User, { 
  through: MessageRead, 
  as: 'readBy',
  foreignKey: 'MessageId',
  otherKey: 'UserId'
});
User.belongsToMany(Message, { 
  through: MessageRead, 
  as: 'readMessages',
  foreignKey: 'UserId',
  otherKey: 'MessageId'
});

// Set up Conversation associations
Conversation.hasMany(ConversationParticipant, { 
  as: 'participants', 
  foreignKey: 'ConversationId' 
});
ConversationParticipant.belongsTo(Conversation, { 
  foreignKey: 'ConversationId' 
});

Conversation.hasMany(Message, { 
  as: 'messages', 
  foreignKey: 'conversationId' 
});

module.exports = {
  sequelize,
  User,
  Group,
  GroupMember,
  Message,
  MessageRead,
  Conversation,
  ConversationParticipant
}; 