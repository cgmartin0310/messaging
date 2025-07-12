const { Sequelize } = require('sequelize');
require('dotenv').config();

// Get database URL and ensure it has SSL parameters
let databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URI || process.env.MONGODB_URI;

// If the URL doesn't have SSL parameters, add them
if (databaseUrl && !databaseUrl.includes('ssl=')) {
  databaseUrl += (databaseUrl.includes('?') ? '&' : '?') + 'ssl=true';
}

// Create SSL configuration based on environment
const getSSLConfig = () => {
  if (process.env.NODE_ENV === 'production') {
    return {
      require: true,
      rejectUnauthorized: false,
      // Add these if you have SSL certificates
      ...(process.env.SSL_CA && { ca: process.env.SSL_CA }),
      ...(process.env.SSL_CERT && { cert: process.env.SSL_CERT }),
      ...(process.env.SSL_KEY && { key: process.env.SSL_KEY })
    };
  }
  return {
    require: true,
    rejectUnauthorized: false
  };
};

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
    ssl: getSSLConfig()
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