const { Sequelize } = require('sequelize');
require('dotenv').config();

// Get database URL
let databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URI || process.env.MONGODB_URI;

// Validate database URL
const isValidPostgresUrl = (url) => {
  try {
    return url && (url.startsWith('postgres://') || url.startsWith('postgresql://'));
  } catch (error) {
    return false;
  }
};

// Only modify URL if it's a valid PostgreSQL URL
if (databaseUrl && isValidPostgresUrl(databaseUrl)) {
  // For Render, use a more permissive SSL configuration
  if (!databaseUrl.includes('ssl=') && !databaseUrl.includes('sslmode=')) {
    databaseUrl += (databaseUrl.includes('?') ? '&' : '?') + 'sslmode=require&ssl=true';
  }
}

// Create Sequelize configuration
const sequelizeConfig = {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};

// Add SSL configuration for production
if (process.env.NODE_ENV === 'production') {
  sequelizeConfig.dialectOptions = {
    ssl: {
      require: true,
      rejectUnauthorized: false,
      // Additional SSL options for Render
      checkServerIdentity: () => undefined
    }
  };
}

const sequelize = new Sequelize(databaseUrl, sequelizeConfig);

module.exports = sequelize; 