const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const Group = sequelize.define('Group', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      len: [1, 100]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  avatar: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isPrivate: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
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
  tableName: 'groups',
  timestamps: true
});

// Define the many-to-many relationship between Users and Groups
const GroupMember = sequelize.define('GroupMember', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  role: {
    type: DataTypes.ENUM('admin', 'moderator', 'member'),
    defaultValue: 'member'
  },
  joinedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'group_members',
  timestamps: true
});

// Associations are set up in models/index.js

// Instance methods
Group.prototype.isMember = function(userId) {
  return this.members && this.members.some(member => 
    member.id === userId && member.GroupMember.isActive
  );
};

Group.prototype.isAdmin = function(userId) {
  return this.members && this.members.some(member => 
    member.id === userId && 
    member.GroupMember.isActive && 
    member.GroupMember.role === 'admin'
  );
};

Group.prototype.isModerator = function(userId) {
  return this.members && this.members.some(member => 
    member.id === userId && 
    member.GroupMember.isActive && 
    (member.GroupMember.role === 'admin' || member.GroupMember.role === 'moderator')
  );
};

Group.prototype.getGroupInfo = function() {
  return {
    id: this.id,
    name: this.name,
    description: this.description,
    avatar: this.avatar,
    isPrivate: this.isPrivate,
    isActive: this.isActive,
    memberCount: this.members ? this.members.filter(m => m.GroupMember.isActive).length : 0,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = { Group, GroupMember }; 