const twilioService = require('./services/twilioService');
require('dotenv').config();

// Function to format phone number to E.164 format
function formatPhoneNumber(phoneNumber) {
  // Remove all non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // If it's a 10-digit number, add +1
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }
  
  // If it already has country code, add +
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }
  
  // If it already has +, return as is
  if (phoneNumber.startsWith('+')) {
    return phoneNumber;
  }
  
  // Default: assume US number and add +1
  return `+1${cleaned}`;
}

// Function to test direct SMS delivery (matches your curl command)
async function testDirectSMSDelivery(phoneNumber, message = 'Test direct SMS from messaging app') {
  console.log('=== Direct SMS Delivery Test ===');
  console.log(`Original phone number: ${phoneNumber}`);
  
  const formattedNumber = formatPhoneNumber(phoneNumber);
  console.log(`Formatted phone number: ${formattedNumber}`);
  
  console.log('\n--- Twilio Configuration ---');
  console.log(`TWILIO_ACCOUNT_SID: ${process.env.TWILIO_ACCOUNT_SID ? 'Set' : 'Not set'}`);
  console.log(`TWILIO_AUTH_TOKEN: ${process.env.TWILIO_AUTH_TOKEN ? 'Set' : 'Not set'}`);
  console.log(`TWILIO_PHONE_NUMBER: ${process.env.TWILIO_PHONE_NUMBER || 'Not set'}`);
  console.log(`TWILIO_MESSAGING_SERVICE_SID: ${process.env.TWILIO_MESSAGING_SERVICE_SID || 'Not set'}`);
  console.log(`BASE_URL: ${process.env.BASE_URL || 'Not set'}`);
  
  console.log('\n--- Sending Direct SMS (matches your curl command) ---');
  try {
    const result = await twilioService.sendDirectSMS(formattedNumber, message);
    
    console.log('SMS Result:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\n✅ Direct SMS sent successfully!');
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
      console.log('\n❌ Direct SMS failed to send');
      console.log(`Error: ${result.error}`);
      console.log(`Code: ${result.code}`);
    }
    
  } catch (error) {
    console.error('Error sending direct SMS:', error.message);
  }
}

// Main execution
async function main() {
  const testPhoneNumber = process.argv[2];
  
  if (!testPhoneNumber) {
    console.log('Usage: node test-sms-direct.js <phone_number>');
    console.log('Example: node test-sms-direct.js 555-123-4567');
    console.log('Example: node test-sms-direct.js +15551234567');
    console.log('\nThis test uses the same approach as your working curl command');
    return;
  }
  
  await testDirectSMSDelivery(testPhoneNumber);
  
  console.log('\n=== Comparison with Your Curl Command ===');
  console.log('Your working curl command:');
  console.log('curl \'https://api.twilio.com/2010-04-01/Accounts/YOUR_ACCOUNT_SID/Messages.json\' -X POST \\');
  console.log('--data-urlencode \'To=+18777804236\' \\');
  console.log('--data-urlencode \'MessagingServiceSid=YOUR_MESSAGING_SERVICE_SID\' \\');
  console.log('--data-urlencode \'Body=test01\' \\');
  console.log('-u YOUR_ACCOUNT_SID:[AuthToken]');
  
  console.log('\n=== Troubleshooting Tips ===');
  console.log('1. Make sure TWILIO_MESSAGING_SERVICE_SID is set in your .env file');
  console.log('2. Check Twilio Console for message status and error codes');
  console.log('3. Verify your Twilio phone number supports SMS (not just voice)');
  console.log('4. For trial accounts, verify recipient phone numbers');
  console.log('5. Check carrier filtering/spam settings on recipient phone');
  console.log('6. Ensure phone number is in E.164 format (+1XXXXXXXXXX)');
}

main(); 