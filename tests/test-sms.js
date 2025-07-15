const twilioService = require('./services/twilioService');

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

// Function to test SMS delivery
async function testSMSDelivery(phoneNumber, message = 'Test SMS from messaging app') {
  console.log('=== SMS Delivery Test ===');
  console.log(`Original phone number: ${phoneNumber}`);
  
  const formattedNumber = formatPhoneNumber(phoneNumber);
  console.log(`Formatted phone number: ${formattedNumber}`);
  
  console.log('\n--- Twilio Configuration ---');
  console.log(`TWILIO_ACCOUNT_SID: ${process.env.TWILIO_ACCOUNT_SID ? 'Set' : 'Not set'}`);
  console.log(`TWILIO_AUTH_TOKEN: ${process.env.TWILIO_AUTH_TOKEN ? 'Set' : 'Not set'}`);
  console.log(`TWILIO_PHONE_NUMBER: ${process.env.TWILIO_PHONE_NUMBER || 'Not set'}`);
  console.log(`BASE_URL: ${process.env.BASE_URL || 'Not set'}`);
  
  console.log('\n--- Sending Test SMS ---');
  try {
    const result = await twilioService.sendDirectSMSWithFrom(formattedNumber, message);
    
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
}

// Function to check if phone number is verified (for trial accounts)
async function checkPhoneNumberVerification(phoneNumber) {
  console.log('\n=== Phone Number Verification Check ===');
  
  if (!process.env.TWILIO_ACCOUNT_SID) {
    console.log('❌ Twilio not configured - cannot check verification');
    return;
  }
  
  const formattedNumber = formatPhoneNumber(phoneNumber);
  console.log(`Checking verification for: ${formattedNumber}`);
  
  try {
    // This would require the Twilio Verify service to be set up
    // For now, just provide guidance
    console.log('\n📋 Trial Account Requirements:');
    console.log('1. Go to https://console.twilio.com/us1/develop/phone-numbers/manage/verified');
    console.log('2. Add your test phone number for verification');
    console.log('3. Verify the phone number via SMS code');
    console.log('4. Only verified numbers can receive SMS on trial accounts');
    
  } catch (error) {
    console.error('Error checking verification:', error.message);
  }
}

// Main execution
async function main() {
  const testPhoneNumber = process.argv[2];
  
  if (!testPhoneNumber) {
    console.log('Usage: node test-sms.js <phone_number>');
    console.log('Example: node test-sms.js 555-123-4567');
    console.log('Example: node test-sms.js +15551234567');
    return;
  }
  
  await testSMSDelivery(testPhoneNumber);
  await checkPhoneNumberVerification(testPhoneNumber);
  
  console.log('\n=== Troubleshooting Tips ===');
  console.log('1. Check Twilio Console for message status and error codes');
  console.log('2. Verify your Twilio phone number supports SMS (not just voice)');
  console.log('3. For trial accounts, verify recipient phone numbers');
  console.log('4. Check carrier filtering/spam settings on recipient phone');
  console.log('5. Ensure phone number is in E.164 format (+1XXXXXXXXXX)');
}

main().catch(console.error); 