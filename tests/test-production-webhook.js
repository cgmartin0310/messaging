require('dotenv').config();
const axios = require('axios');

async function testProductionWebhook() {
  console.log('=== Production Webhook Test ===\n');
  
  const baseUrl = 'https://messaging-backend-7bvd.onrender.com';
  const webhookUrl = `${baseUrl}/api/webhooks/twilio/incoming`;
  
  console.log('Configuration:');
  console.log(`Production Backend URL: ${baseUrl}`);
  console.log(`Webhook URL: ${webhookUrl}`);
  console.log(`Your Virtual Number: +19104442405`);
  
  console.log('\n=== Testing Production Webhook ===');
  
  // Test the exact scenario you're experiencing
  const testCase = {
    name: 'Response from Twilio test number to your virtual number',
    data: {
      From: '+18777804236', // Twilio test number (sender)
      To: '+19104442405',   // Your virtual number (recipient)
      Body: 'This is a test response from Twilio test number to your virtual number',
      MessageSid: 'test-production-response-1'
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
    console.log('\n🎉 The webhook is working!');
    console.log('This means your backend can receive webhooks from Twilio.');
    
  } catch (error) {
    console.error(`❌ Webhook error: ${error.response?.status || 'No response'}`);
    console.error(`Error: ${error.message}`);
    
    if (error.response?.status === 403) {
      console.log('\nThis is a signature verification error.');
      console.log('The webhook is receiving the request but rejecting due to signature.');
      console.log('This is normal for manual testing - Twilio will send proper signatures.');
    } else if (error.response?.status === 500) {
      console.log('\nThis is a server error. Check your application logs on Render.');
    }
  }
  
  console.log('\n=== Twilio Console Configuration ===');
  console.log('\nConfigure these webhook URLs in your Twilio Console:');
  console.log('\nFor your Twilio number +19104442405:');
  console.log('\n1. Go to https://console.twilio.com');
  console.log('2. Navigate to Phone Numbers > Manage > Active numbers');
  console.log('3. Click on your number +19104442405');
  console.log('4. Scroll down to "Messaging" section');
  console.log('5. Set "A MESSAGE COMES IN" webhook URL to:');
  console.log(`   ${webhookUrl}`);
  console.log('6. Set "STATUS CALLBACK" webhook URL to:');
  console.log(`   ${baseUrl}/api/webhooks/twilio/status`);
  console.log('7. Save the configuration');
  
  console.log('\n=== Environment Variables ===');
  console.log('\nMake sure to set this in your Render environment variables:');
  console.log(`BASE_URL=${baseUrl}`);
  
  console.log('\n=== Testing Steps ===');
  console.log('\n1. Configure the webhook URLs in Twilio Console (see above)');
  console.log('2. Set BASE_URL environment variable in Render');
  console.log('3. Send a message from your app to the Twilio test number');
  console.log('4. Reply from the test number to your virtual number +19104442405');
  console.log('5. Check if the response appears in your conversation');
  
  console.log('\n=== Expected Flow ===');
  console.log('\n1. You send message → Twilio test number');
  console.log('2. Twilio test number replies → Your virtual number +19104442405');
  console.log('3. Twilio sends webhook → Your backend (messaging-backend-7bvd.onrender.com)');
  console.log('4. Backend processes message → Saves to database');
  console.log('5. Message appears → In your web conversation');
}

testProductionWebhook().catch(console.error); 