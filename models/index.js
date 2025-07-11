const sequelize = require('../config/database');
const User = require('./User');
const { Group, GroupMember } = require('./Group');
const { Message, MessageRead } = require('./Message');

// Set up associations
Group.belongsToMany(User, { through: GroupMember, as: 'members' });
User.belongsToMany(Group, { through: GroupMember, as: 'groups' });

Message.belongsTo(User, { as: 'sender', foreignKey: 'senderId' });
Message.belongsTo(Group, { as: 'group', foreignKey: 'groupId' });
Message.belongsTo(Message, { as: 'replyTo', foreignKey: 'replyToId' });
Message.belongsToMany(User, { through: MessageRead, as: 'readBy' });

module.exports = {
  sequelize,
  User,
  Group,
  GroupMember,
  Message,
  MessageRead
}; 