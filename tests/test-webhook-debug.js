require('dotenv').config();
const axios = require('axios');

async function testWebhookDebug() {
  console.log('=== Webhook Debug Test ===\n');
  
  const baseUrl = process.env.BASE_URL || 'http://localhost:5001';
  const webhookUrl = `${baseUrl}/api/webhooks/twilio/incoming`;
  
  console.log(`Webhook URL: ${webhookUrl}`);
  console.log(`TWILIO_PHONE_NUMBER: ${process.env.TWILIO_PHONE_NUMBER}`);
  console.log(`BASE_URL: ${process.env.BASE_URL}`);
  
  // Test the exact scenario you're experiencing
  const testCase = {
    name: 'Response from Twilio test number to your virtual number',
    data: {
      From: '+18777804236', // Twilio test number (sender)
      To: '+19104442405',   // Your virtual number (recipient)
      Body: 'This is a test response from Twilio test number',
      MessageSid: 'test-response-1'
    }
  };
  
  console.log(`\n--- Testing: ${testCase.name} ---`);
  console.log(`From: ${testCase.data.From}`);
  console.log(`To: ${testCase.data.To}`);
  console.log(`Body: ${testCase.data.Body}`);
  
  try {
    const response = await axios.post(webhookUrl, testCase.data, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    console.log(`✅ Webhook response: ${response.status} - ${response.data}`);
    console.log('\nThis means the webhook is working!');
    console.log('The issue might be:');
    console.log('1. Twilio is not configured to send webhooks to your virtual number');
    console.log('2. The webhook URL is not set correctly in Twilio');
    console.log('3. The virtual number is not a real Twilio number');
    
  } catch (error) {
    console.error(`❌ Webhook error: ${error.response?.status} - ${error.response?.data}`);
    console.error(`Error details: ${error.message}`);
    
    if (error.response?.status === 403) {
      console.log('\nThis is a signature verification error.');
      console.log('The webhook is receiving the request but rejecting it due to signature.');
    } else if (error.response?.status === 500) {
      console.log('\nThis is a server error.');
      console.log('Check your application logs for more details.');
    }
  }
  
  // Test with your main Twilio number
  console.log('\n--- Testing with main Twilio number ---');
  const mainNumberTest = {
    name: 'Response to main Twilio number',
    data: {
      From: '+18777804236', // Twilio test number
      To: process.env.TWILIO_PHONE_NUMBER, // Your main Twilio number
      Body: 'This is a test response to main Twilio number',
      MessageSid: 'test-response-2'
    }
  };
  
  console.log(`From: ${mainNumberTest.data.From}`);
  console.log(`To: ${mainNumberTest.data.To}`);
  console.log(`Body: ${mainNumberTest.data.Body}`);
  
  try {
    const response2 = await axios.post(webhookUrl, mainNumberTest.data, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    console.log(`✅ Webhook response: ${response2.status} - ${response2.data}`);
    console.log('\nThis should work if your main Twilio number is configured for webhooks.');
    
  } catch (error) {
    console.error(`❌ Webhook error: ${error.response?.status} - ${error.response?.data}`);
    console.error(`Error details: ${error.message}`);
  }
  
  console.log('\n=== Debug Test Complete ===');
  console.log('\nNext steps:');
  console.log('1. Check your Twilio console to see if webhooks are configured');
  console.log('2. Verify the webhook URL is correct');
  console.log('3. Check if your virtual number is a real Twilio number');
  console.log('4. Look at your application logs for more details');
}

testWebhookDebug().catch(console.error); 