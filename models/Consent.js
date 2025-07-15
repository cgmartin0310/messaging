const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Contact = require('./Contact');
const User = require('./User'); // Assuming Patient is a User

const Consent = sequelize.define('Consent', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  contactId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'contacts',
      key: 'id'
    }
  },
  groupId: {
    type: DataTypes.UUID,
    allowNull: true,
    // Add reference if Group model exists
  },
  patientId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  consentGiven: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  consentDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
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
  tableName: 'consents',
  timestamps: true
});

// Associations
Consent.belongsTo(Contact, { foreignKey: 'contactId' });
Consent.belongsTo(User, { as: 'Patient', foreignKey: 'patientId' });

module.exports = Consent; 