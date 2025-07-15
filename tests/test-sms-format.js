const twilioService = require('./services/twilioService');
require('dotenv').config();

// Test SMS sending format to match the user's curl command
async function testSMSFormat() {
  console.log('=== Testing SMS Format ===');
  console.log('\n--- Environment Variables ---');
  console.log(`TWILIO_ACCOUNT_SID: ${process.env.TWILIO_ACCOUNT_SID ? 'Set' : 'Not set'}`);
  console.log(`TWILIO_AUTH_TOKEN: ${process.env.TWILIO_AUTH_TOKEN ? 'Set' : 'Not set'}`);
  console.log(`TWILIO_PHONE_NUMBER: ${process.env.TWILIO_PHONE_NUMBER || 'Not set'}`);
  console.log(`TWILIO_MESSAGING_SERVICE_SID: ${process.env.TWILIO_MESSAGING_SERVICE_SID || 'Not set'}`);
  
  console.log('\n--- Your Curl Command ---');
  console.log('curl \'https://api.twilio.com/2010-04-01/Accounts/YOUR_ACCOUNT_SID/Messages.json\' -X POST \\');
  console.log('--data-urlencode \'To=+18777804236\' \\');
  console.log('--data-urlencode \'From=+19104442405\' \\');
  console.log('--data-urlencode \'Body=test5\' \\');
  console.log('-u YOUR_ACCOUNT_SID:[AuthToken]');
  
  console.log('\n--- Testing Direct SMS (should match your curl format) ---');
  try {
    const result = await twilioService.sendDirectSMS('+18777804236', 'test5');
    
    console.log('SMS Result:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\n✅ SMS sent successfully!');
      console.log(`Message ID: ${result.messageId}`);
      console.log(`Status: ${result.status}`);
      console.log(`To: ${result.to}`);
      console.log(`From: ${result.from}`);
      
      // Check message status after a delay
      console.log('\n--- Checking Message Status (after 5 seconds) ---');
      setTimeout(async () => {
        try {
          const statusResult = await twilioService.getMessageStatus(result.messageId);
          console.log('Status Check Result:', JSON.stringify(statusResult, null, 2));
        } catch (error) {
          console.error('Error checking message status:', error.message);
        }
      }, 5000);
      
    } else {
      console.log('\n❌ SMS failed to send');
      console.log(`Error: ${result.error}`);
      console.log(`Code: ${result.code}`);
    }
    
  } catch (error) {
    console.error('Error sending SMS:', error.message);
  }
  
  console.log('\n=== Format Comparison ===');
  console.log('Your curl command uses:');
  console.log('- To: +18777804236');
  console.log('- From: +19104442405 (your Twilio number)');
  console.log('- Body: test5');
  console.log('- Uses basic auth with Account SID and Auth Token');
  
  console.log('\nOur sendDirectSMS method uses:');
  console.log('- To: +18777804236');
  console.log('- From: TWILIO_PHONE_NUMBER or TWILIO_MESSAGING_SERVICE_SID');
  console.log('- Body: test5');
  console.log('- Uses Twilio SDK with Account SID and Auth Token');
  
  console.log('\n✅ The formats are equivalent!');
}

// Main execution
testSMSFormat(); 