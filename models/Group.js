const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Contact = require('./Contact');

const Group = sequelize.define('Group', {
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
  userId: {
    type: DataTypes.UUID,
    allowNull: true, // Temporary: Allow null for deployment; enforce NOT NULL after migrating data
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
  tableName: 'groups',
  timestamps: true
});

const GroupContact = sequelize.define('GroupContact', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  groupId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'groups',
      key: 'id'
    }
  },
  contactId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'contacts',
      key: 'id'
    }
  }
}, {
  tableName: 'group_contacts',
  timestamps: false
});

// Associations
Group.belongsTo(User, { foreignKey: 'userId' });
Group.belongsToMany(Contact, { through: GroupContact, foreignKey: 'groupId' });
Contact.belongsToMany(Group, { through: GroupContact, foreignKey: 'contactId' });

module.exports = { Group, GroupContact }; 