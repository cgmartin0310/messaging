const { Sequelize } = require('sequelize');
require('dotenv').config();

// Get database URL and ensure it has SSL parameters
let databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URI || process.env.MONGODB_URI;

// If the URL doesn't have SSL parameters, add them
if (databaseUrl && !databaseUrl.includes('ssl=')) {
  databaseUrl += (databaseUrl.includes('?') ? '&' : '?') + 'ssl=true';
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
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

module.exports = sequelize; 