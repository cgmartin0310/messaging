const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Patient = require('./Patient');

const Document = sequelize.define('Document', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  patientId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'patients',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM('Internal/Interagency', 'TPO', 'Legal/Investigative Disclosure', 'Other Non-TPO', 'SUD Counseling Notes'),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  fileUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  consentDetails: {
    type: DataTypes.JSON,
    allowNull: true
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

Document.belongsTo(Patient, { foreignKey: 'patientId' });

module.exports = Document; 