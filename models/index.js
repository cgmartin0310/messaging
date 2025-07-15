const sequelize = require('../config/database');

// Import models
const User = require('./User');
const Contact = require('./Contact');
const { Message, MessageRead } = require('./Message');
const { Conversation, ConversationParticipant } = require('./Conversation');
const Patient = require('./Patient');
const Document = require('./Document');
const Consent = require('./Consent');
const Group = require('./Group');

// Set up Contact associations
Contact.belongsTo(User, { 
  as: 'user', 
  foreignKey: 'userId' 
});

// Set up Message associations
Message.belongsTo(User, { 
  as: 'sender', 
  foreignKey: 'senderId' 
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

// Patient associations
Patient.hasMany(Document, {
  foreignKey: 'patientId',
  as: 'documents'
});
Document.belongsTo(Patient, {
  foreignKey: 'patientId'
});

// Consent associations
Consent.belongsTo(Contact, { foreignKey: 'contactId' });
Consent.belongsTo(Patient, { foreignKey: 'patientId' });

// Remove problematic Group association
// Group.belongsToMany(Contact, { through: 'GroupContacts' });

module.exports = {
  sequelize,
  User,
  Contact,
  Message,
  MessageRead,
  Conversation,
  ConversationParticipant,
  Patient,
  Document,
  Consent,
  Group
}; 