#!/usr/bin/env node

require('dotenv').config();
const { testConnection } = require('./config/database');

async function testDatabaseConnection() {
  console.log('=== Database Connection Test ===');
  console.log('Environment:', process.env.NODE_ENV || 'development');
  console.log('Database URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
  console.log('Postgres URI:', process.env.POSTGRES_URI ? 'Set' : 'Not set');
  console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');
  
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URI && !process.env.MONGODB_URI) {
    console.log('\n❌ No database URL found in environment variables');
    console.log('Please set DATABASE_URL, POSTGRES_URI, or MONGODB_URI');
    process.exit(1);
  }
  
  console.log('\nAttempting to connect to database...');
  
  try {
    const connected = await testConnection();
    
    if (connected) {
      console.log('\n✅ Database connection successful!');
      console.log('Your database configuration is working correctly.');
    } else {
      console.log('\n❌ Database connection failed');
      console.log('Please check your database configuration.');
    }
  } catch (error) {
    console.error('\n❌ Database test failed:', error.message);
    console.error('Error details:', error);
  }
  
  process.exit(0);
}

testDatabaseConnection(); 