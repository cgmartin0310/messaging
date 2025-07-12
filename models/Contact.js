const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Contact = sequelize.define('Contact', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  contactType: {
    type: DataTypes.ENUM('internal', 'external'),
    allowNull: false,
    defaultValue: 'external'
  },
  // For internal contacts (app users)
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  // For external contacts (SMS)
  phoneNumber: {
    type: DataTypes.STRING(15),
    allowNull: true,
    validate: {
      is: /^\+?[1-9]\d{1,14}$/
    }
  },
  firstName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      len: [1, 50]
    }
  },
  lastName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      len: [1, 50]
    }
  },
  displayName: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  avatar: {
    type: DataTypes.STRING,
    allowNull: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
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
  tableName: 'contacts',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['userId']
    },
    {
      unique: true,
      fields: ['phoneNumber']
    }
  ]
});

// Instance methods
Contact.prototype.getDisplayName = function() {
  if (this.displayName) {
    return this.displayName;
  }
  return `${this.firstName} ${this.lastName}`;
};

Contact.prototype.getContactInfo = function() {
  return {
    id: this.id,
    contactType: this.contactType,
    userId: this.userId,
    phoneNumber: this.phoneNumber,
    firstName: this.firstName,
    lastName: this.lastName,
    displayName: this.getDisplayName(),
    avatar: this.avatar,
    email: this.email,
    isActive: this.isActive,
    notes: this.notes,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Static methods
Contact.createFromUser = async function(user) {
  return await this.create({
    contactType: 'internal',
    userId: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    phoneNumber: user.phoneNumber,
    email: user.email,
    avatar: user.avatar
  });
};

Contact.createExternalContact = async function(contactData) {
  return await this.create({
    contactType: 'external',
    phoneNumber: contactData.phoneNumber,
    firstName: contactData.firstName,
    lastName: contactData.lastName,
    displayName: contactData.displayName,
    email: contactData.email,
    notes: contactData.notes
  });
};

module.exports = Contact; 