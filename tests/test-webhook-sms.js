require('dotenv').config();
const axios = require('axios');

async function testWebhookSMS() {
  console.log('=== Testing SMS Webhook Processing ===\n');
  
  const baseUrl = process.env.BASE_URL || 'http://localhost:5001';
  const webhookUrl = `${baseUrl}/api/webhooks/twilio/incoming`;
  
  console.log(`Testing webhook URL: ${webhookUrl}\n`);
  
  // Test cases
  const testCases = [
    {
      name: 'Internal user to internal user (virtual numbers)',
      data: {
        From: '+19104442405', // Sender's virtual number
        To: '+19104442406',   // Recipient's virtual number
        Body: 'Hello from internal user!',
        MessageSid: 'test-message-1'
      }
    },
    {
      name: 'External SMS to internal user',
      data: {
        From: '+18777804236', // External phone number
        To: '+19104442405',   // Internal user's virtual number
        Body: 'Hello from external SMS!',
        MessageSid: 'test-message-2'
      }
    },
    {
      name: 'External SMS to regular Twilio number',
      data: {
        From: '+18777804236', // External phone number
        To: process.env.TWILIO_PHONE_NUMBER, // Your main Twilio number
        Body: 'Hello to main Twilio number!',
        MessageSid: 'test-message-3'
      }
    }
  ];
  
  for (const testCase of testCases) {
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
    } catch (error) {
      console.error(`❌ Webhook error: ${error.response?.status} - ${error.response?.data}`);
      console.error(`Error details: ${error.message}`);
    }
  }
  
  console.log('\n=== Webhook Test Complete ===');
  console.log('\nCheck your application logs to see if messages were processed correctly.');
  console.log('You should see:');
  console.log('- Messages being saved to the database');
  console.log('- Conversations being found');
  console.log('- SMS being sent to other participants');
}

testWebhookSMS().catch(console.error); 