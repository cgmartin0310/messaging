#!/usr/bin/env node

require('dotenv').config();

function debugDatabaseUrl() {
  console.log('=== Database URL Debug ===');
  
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URI || process.env.MONGODB_URI;
  
  if (!databaseUrl) {
    console.log('❌ No DATABASE_URL found in environment variables');
    console.log('Please set DATABASE_URL in your Render environment variables');
    return;
  }
  
  console.log('✅ DATABASE_URL is set');
  
  // Parse the URL to show structure without exposing credentials
  try {
    const url = new URL(databaseUrl);
    console.log('📊 URL Structure:');
    console.log(`  Protocol: ${url.protocol}`);
    console.log(`  Hostname: ${url.hostname}`);
    console.log(`  Port: ${url.port || 'default'}`);
    console.log(`  Database: ${url.pathname.replace('/', '')}`);
    console.log(`  Has username: ${url.username ? 'Yes' : 'No'}`);
    console.log(`  Has password: ${url.password ? 'Yes' : 'No'}`);
    console.log(`  Query params: ${url.search || 'None'}`);
    
    // Check for SSL parameters
    const hasSSL = databaseUrl.includes('ssl=');
    const hasSSLMode = databaseUrl.includes('sslmode=');
    
    console.log('\n🔒 SSL Configuration:');
    console.log(`  Has ssl parameter: ${hasSSL}`);
    console.log(`  Has sslmode parameter: ${hasSSLMode}`);
    
    if (hasSSL || hasSSLMode) {
      console.log('⚠️  SSL parameters found in URL - this might be causing issues');
      console.log('   Try removing SSL parameters from your DATABASE_URL');
    }
    
    // Check if it's a Render PostgreSQL URL
    const isRenderPostgres = url.hostname.includes('render.com') || url.hostname.includes('onrender.com');
    console.log(`\n🌐 Render Database: ${isRenderPostgres ? 'Yes' : 'No'}`);
    
    if (isRenderPostgres) {
      console.log('💡 For Render PostgreSQL, try these DATABASE_URL formats:');
      console.log('   Format 1: postgresql://username:password@host:port/database');
      console.log('   Format 2: postgresql://username:password@host:port/database?sslmode=require');
      console.log('   Format 3: postgresql://username:password@host:port/database?ssl=true');
    }
    
  } catch (error) {
    console.log('❌ Invalid DATABASE_URL format');
    console.log('Error:', error.message);
  }
  
  console.log('\n🔧 Environment:');
  console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  console.log(`  PORT: ${process.env.PORT || 'not set'}`);
}

debugDatabaseUrl(); 