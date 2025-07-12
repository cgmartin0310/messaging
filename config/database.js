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
  },
  retry: {
    max: 3,
    timeout: 10000
  }
};

// Add SSL configuration for production
if (process.env.NODE_ENV === 'production') {
  // Primary SSL configuration for Render
  sequelizeConfig.dialectOptions = {
    ssl: {
      require: true,
      rejectUnauthorized: false,
      // Additional SSL options for Render
      checkServerIdentity: () => undefined,
      // Add more SSL options to handle self-signed certificates
      ca: process.env.SSL_CA,
      cert: process.env.SSL_CERT,
      key: process.env.SSL_KEY
    }
  };
  
  // Alternative SSL configuration for Render if no custom certificates
  if (!process.env.SSL_CA && !process.env.SSL_CERT && !process.env.SSL_KEY) {
    sequelizeConfig.dialectOptions.ssl = {
      require: true,
      rejectUnauthorized: false,
      checkServerIdentity: () => undefined
    };
  }
}

// Create Sequelize instance
const sequelize = new Sequelize(databaseUrl, sequelizeConfig);

// Test connection function
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL connected successfully');
    return true;
  } catch (error) {
    console.error('Database connection error:', error.message);
    
    // If SSL fails, try without SSL
    if (error.message.includes('self-signed certificate') || error.message.includes('SSL')) {
      console.log('SSL connection failed, attempting without SSL...');
      try {
        // Create a new connection without SSL
        const noSSLConfig = {
          ...sequelizeConfig,
          dialectOptions: {
            ssl: false
          }
        };
        const noSSLSequelize = new Sequelize(databaseUrl, noSSLConfig);
        await noSSLSequelize.authenticate();
        console.log('PostgreSQL connected without SSL');
        return true;
      } catch (noSSLError) {
        console.error('Non-SSL connection also failed:', noSSLError.message);
        return false;
      }
    }
    return false;
  }
};

module.exports = sequelize;
module.exports.testConnection = testConnection; 