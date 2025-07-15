require('dotenv').config();
const { User } = require('./models');

async function checkPhoneNumbers() {
  console.log('=== Phone Number Configuration Check ===\n');
  
  console.log('Environment Variables:');
  console.log(`TWILIO_PHONE_NUMBER: ${process.env.TWILIO_PHONE_NUMBER || 'Not set'}`);
  console.log(`TWILIO_MESSAGING_SERVICE_SID: ${process.env.TWILIO_MESSAGING_SERVICE_SID || 'Not set'}`);
  console.log(`BASE_URL: ${process.env.BASE_URL || 'Not set'}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV || 'Not set'}`);
  
  console.log('\nWebhook URLs:');
  console.log(`Incoming SMS: ${process.env.BASE_URL || 'http://localhost:5001'}/api/webhooks/twilio/incoming`);
  console.log(`Status Callback: ${process.env.BASE_URL || 'http://localhost:5001'}/api/webhooks/twilio/status`);
  
  console.log('\nDatabase Phone Numbers:');
  
  try {
    // Get all users with virtual phone numbers
    const usersWithVirtualNumbers = await User.findAll({
      where: { virtualPhoneNumber: { [require('sequelize').Op.ne]: null } },
      attributes: ['id', 'username', 'firstName', 'lastName', 'virtualPhoneNumber']
    });
    
    console.log(`\nUsers with virtual phone numbers: ${usersWithVirtualNumbers.length}`);
    usersWithVirtualNumbers.forEach(user => {
      console.log(`  - ${user.firstName} ${user.lastName} (${user.username}): ${user.virtualPhoneNumber}`);
    });
    
    if (usersWithVirtualNumbers.length === 0) {
      console.log('\n⚠️  No users have virtual phone numbers assigned!');
      console.log('   This means SMS responses won\'t be processed.');
      console.log('   You need to assign virtual numbers to users.');
    }
    
    // Get all users without virtual phone numbers
    const usersWithoutVirtualNumbers = await User.findAll({
      where: { virtualPhoneNumber: null },
      attributes: ['id', 'username', 'firstName', 'lastName']
    });
    
    console.log(`\nUsers without virtual phone numbers: ${usersWithoutVirtualNumbers.length}`);
    usersWithoutVirtualNumbers.forEach(user => {
      console.log(`  - ${user.firstName} ${user.lastName} (${user.username})`);
    });
    
  } catch (error) {
    console.error('Error checking database:', error);
  }
  
  console.log('\n=== Analysis ===');
  console.log('\nFor webhooks to work:');
  console.log('1. Your main Twilio number must be configured for webhooks');
  console.log('2. The webhook URL must be accessible from the internet');
  console.log('3. Virtual numbers must be real Twilio numbers (not fake ones)');
  console.log('4. Users must have virtual phone numbers assigned');
  
  console.log('\nCurrent issues:');
  if (!process.env.TWILIO_PHONE_NUMBER) {
    console.log('❌ TWILIO_PHONE_NUMBER not set');
  } else {
    console.log('✅ TWILIO_PHONE_NUMBER is set');
  }
  
  if (!process.env.BASE_URL) {
    console.log('❌ BASE_URL not set (webhook URL will be localhost)');
  } else {
    console.log('✅ BASE_URL is set');
  }
  
  if (usersWithVirtualNumbers.length === 0) {
    console.log('❌ No users have virtual phone numbers');
  } else {
    console.log('✅ Users have virtual phone numbers');
  }
  
  console.log('\n=== Recommendations ===');
  console.log('\n1. Check your Twilio Console:');
  console.log('   - Go to https://console.twilio.com');
  console.log('   - Navigate to Phone Numbers > Manage > Active numbers');
  console.log('   - Check if your main number has webhooks configured');
  
  console.log('\n2. Verify webhook URL:');
  console.log('   - The webhook URL should be publicly accessible');
  console.log('   - For local development, use ngrok');
  console.log('   - For production, use your deployed URL');
  
  console.log('\n3. Check virtual numbers:');
  console.log('   - Virtual numbers should be real Twilio numbers');
  console.log('   - They should be purchased in your Twilio account');
  console.log('   - They should be configured for webhooks');
  
  console.log('\n4. Test webhook manually:');
  console.log('   - Run: node test-webhook-debug.js');
  console.log('   - This will test if the webhook endpoint is working');
}

checkPhoneNumbers().catch(console.error); 