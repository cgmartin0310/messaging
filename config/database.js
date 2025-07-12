const { Sequelize } = require('sequelize');
require('dotenv').config();

// Get database URL and ensure it has SSL parameters
let databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URI || process.env.MONGODB_URI;

// Create SSL configuration based on environment
const getSSLConfig = () => {
  if (process.env.NODE_ENV === 'production') {
    // For production, try different SSL configurations
    return {
      require: false, // Make SSL optional
      rejectUnauthorized: false,
      // For Render, be more permissive with SSL
      checkServerIdentity: () => undefined
    };
  }
  return {
    require: false, // Make SSL optional for development too
    rejectUnauthorized: false
  };
};

// Try to parse the database URL to check if it's a valid PostgreSQL URL
const isValidPostgresUrl = (url) => {
  try {
    return url && (url.startsWith('postgres://') || url.startsWith('postgresql://'));
  } catch (error) {
    return false;
  }
};

// Only add SSL parameters if it's a valid PostgreSQL URL
if (databaseUrl && isValidPostgresUrl(databaseUrl) && !databaseUrl.includes('ssl=')) {
  databaseUrl += (databaseUrl.includes('?') ? '&' : '?') + 'sslmode=prefer';
}

const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  dialectOptions: {
    ssl: getSSLConfig(),
    // Add additional connection options for better compatibility
    connectTimeout: 60000,
    options: {
      requestTimeout: 60000,
      cancelTimeout: 5000
    }
  },
  // Add retry logic for connection issues
  retry: {
    max: 3,
    backoffBase: 1000,
    backoffExponent: 1.5
  },
  // Add connection timeout
  timeout: 60000
});

module.exports = sequelize; 