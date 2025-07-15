require('dotenv').config();
const axios = require('axios');

async function checkTwilioWebhook() {
  console.log('=== Twilio Webhook Configuration Check ===\n');
  
  const baseUrl = process.env.BASE_URL || 'http://localhost:5001';
  const webhookUrl = `${baseUrl}/api/webhooks/twilio/incoming`;
  
  console.log('Configuration:');
  console.log(`TWILIO_PHONE_NUMBER: ${process.env.TWILIO_PHONE_NUMBER}`);
  console.log(`Your Virtual Number: +19104442405`);
  console.log(`Webhook URL: ${webhookUrl}`);
  console.log(`BASE_URL: ${process.env.BASE_URL || 'Not set (using localhost)'}`);
  
  console.log('\n=== Testing Webhook for Your Virtual Number ===');
  
  // Test 1: Simulate response to your virtual number
  const testCase1 = {
    name: 'Response to your virtual number +19104442405',
    data: {
      From: '+18777804236', // Twilio test number
      To: '+19104442405',   // Your virtual number
      Body: 'This is a test response to your virtual number',
      MessageSid: 'test-virtual-response-1'
    }
  };
  
  console.log(`\n--- Test 1: ${testCase1.name} ---`);
  console.log(`From: ${testCase1.data.From}`);
  console.log(`To: ${testCase1.data.To}`);
  console.log(`Body: ${testCase1.data.Body}`);
  
  try {
    const response1 = await axios.post(webhookUrl, testCase1.data, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    console.log(`✅ Webhook response: ${response1.status} - ${response1.data}`);
    console.log('The webhook is working for your virtual number!');
    
  } catch (error) {
    console.error(`❌ Webhook error: ${error.response?.status || 'No response'}`);
    console.error(`Error: ${error.message}`);
    
    if (error.response?.status === 403) {
      console.log('\nThis is a signature verification error.');
      console.log('The webhook is receiving the request but rejecting due to signature.');
    } else if (error.response?.status === 500) {
      console.log('\nThis is a server error. Check your application logs.');
    }
  }
  
  // Test 2: Simulate response to your main Twilio number
  console.log('\n--- Test 2: Response to main Twilio number ---');
  const testCase2 = {
    name: 'Response to main Twilio number',
    data: {
      From: '+18777804236', // Twilio test number
      To: process.env.TWILIO_PHONE_NUMBER, // Your main Twilio number
      Body: 'This is a test response to your main Twilio number',
      MessageSid: 'test-main-response-1'
    }
  };
  
  console.log(`From: ${testCase2.data.From}`);
  console.log(`To: ${testCase2.data.To}`);
  console.log(`Body: ${testCase2.data.Body}`);
  
  try {
    const response2 = await axios.post(webhookUrl, testCase2.data, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    console.log(`✅ Webhook response: ${response2.status} - ${response2.data}`);
    
  } catch (error) {
    console.error(`❌ Webhook error: ${error.response?.status || 'No response'}`);
    console.error(`Error: ${error.message}`);
  }
  
  console.log('\n=== Twilio Console Configuration ===');
  console.log('\nTo configure webhooks for your Twilio number +19104442405:');
  console.log('\n1. Go to https://console.twilio.com');
  console.log('2. Navigate to Phone Numbers > Manage > Active numbers');
  console.log('3. Click on your number +19104442405');
  console.log('4. Scroll down to "Messaging" section');
  console.log('5. Set "A MESSAGE COMES IN" webhook URL to:');
  console.log(`   ${webhookUrl}`);
  console.log('6. Set "STATUS CALLBACK" webhook URL to:');
  console.log(`   ${baseUrl}/api/webhooks/twilio/status`);
  console.log('7. Save the configuration');
  
  console.log('\n=== Production vs Development ===');
  if (!process.env.BASE_URL) {
    console.log('\n⚠️  BASE_URL not set!');
    console.log('For production, set BASE_URL to your deployed URL:');
    console.log('   BASE_URL=https://your-app.onrender.com');
    console.log('\nFor local development, use ngrok:');
    console.log('   1. Install ngrok: npm install -g ngrok');
    console.log('   2. Run: ngrok http 5001');
    console.log('   3. Use the ngrok URL as your webhook URL');
  } else {
    console.log('\n✅ BASE_URL is set');
    console.log(`   Using: ${process.env.BASE_URL}`);
  }
  
  console.log('\n=== Testing Steps ===');
  console.log('\n1. Configure webhooks in Twilio Console');
  console.log('2. Send a test SMS to your virtual number +19104442405');
  console.log('3. Check your application logs for webhook activity');
  console.log('4. Verify the message appears in your conversation');
  
  console.log('\n=== Debug Commands ===');
  console.log('\nTo test webhook manually:');
  console.log('   node test-webhook-simple.js');
  console.log('\nTo check phone number configuration:');
  console.log('   node check-phone-numbers.js');
}

checkTwilioWebhook().catch(console.error); 