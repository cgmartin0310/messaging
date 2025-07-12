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

// Create base Sequelize configuration
const createSequelizeConfig = (useSSL = true) => {
  const config = {
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

  if (process.env.NODE_ENV === 'production') {
    if (useSSL) {
      // Try with SSL but very permissive settings
      config.dialectOptions = {
        ssl: {
          require: true,
          rejectUnauthorized: false,
          checkServerIdentity: () => undefined
        }
      };
    } else {
      // No SSL at all
      config.dialectOptions = {
        ssl: false
      };
    }
  }

  return config;
};

// Test connection function with multiple strategies
const testConnection = async () => {
  if (!databaseUrl || !isValidPostgresUrl(databaseUrl)) {
    console.error('Invalid or missing DATABASE_URL');
    return false;
  }

  console.log('Testing database connection with multiple strategies...');

  // Strategy 1: Try with SSL but very permissive
  try {
    console.log('Strategy 1: Trying with SSL (permissive settings)...');
    const sequelize1 = new Sequelize(databaseUrl, createSequelizeConfig(true));
    await sequelize1.authenticate();
    console.log('✅ PostgreSQL connected successfully with SSL');
    await sequelize1.close();
    return true;
  } catch (error) {
    console.log('Strategy 1 failed:', error.message);
  }

  // Strategy 2: Try without SSL completely
  try {
    console.log('Strategy 2: Trying without SSL...');
    const sequelize2 = new Sequelize(databaseUrl, createSequelizeConfig(false));
    await sequelize2.authenticate();
    console.log('✅ PostgreSQL connected successfully without SSL');
    await sequelize2.close();
    return true;
  } catch (error) {
    console.log('Strategy 2 failed:', error.message);
  }

  // Strategy 3: Try with URL parameters removed
  try {
    console.log('Strategy 3: Trying with clean URL (no SSL params)...');
    let cleanUrl = databaseUrl;
    // Remove any SSL parameters from the URL
    cleanUrl = cleanUrl.replace(/[?&]ssl[^&]*/g, '');
    cleanUrl = cleanUrl.replace(/[?&]sslmode[^&]*/g, '');
    cleanUrl = cleanUrl.replace(/\?&/, '?');
    cleanUrl = cleanUrl.replace(/&&/, '&');
    cleanUrl = cleanUrl.replace(/\?$/, '');
    
    const sequelize3 = new Sequelize(cleanUrl, createSequelizeConfig(false));
    await sequelize3.authenticate();
    console.log('✅ PostgreSQL connected successfully with clean URL');
    await sequelize3.close();
    return true;
  } catch (error) {
    console.log('Strategy 3 failed:', error.message);
  }

  console.error('❌ All connection strategies failed');
  return false;
};

// Create the main Sequelize instance with the most likely working configuration
const sequelize = new Sequelize(databaseUrl, createSequelizeConfig(true));

module.exports = sequelize;
module.exports.testConnection = testConnection; 