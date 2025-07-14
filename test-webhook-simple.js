require('dotenv').config();
const axios = require('axios');

async function testWebhookSimple() {
  console.log('=== Simple Webhook Test ===\n');
  
  const baseUrl = process.env.BASE_URL || 'http://localhost:5001';
  const webhookUrl = `${baseUrl}/api/webhooks/twilio/incoming`;
  
  console.log(`Testing webhook URL: ${webhookUrl}`);
  console.log(`TWILIO_PHONE_NUMBER: ${process.env.TWILIO_PHONE_NUMBER}`);
  console.log(`BASE_URL: ${process.env.BASE_URL || 'Not set (using localhost)'}`);
  
  // Test 1: Simple webhook test without signature verification
  console.log('\n--- Test 1: Basic webhook functionality ---');
  
  const testData = {
    From: '+18777804236', // Twilio test number
    To: '+19104442405',   // Your virtual number
    Body: 'Test message from Twilio test number',
    MessageSid: 'test-simple-1'
  };
  
  try {
    const response = await axios.post(webhookUrl, testData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    console.log(`✅ Webhook responded: ${response.status} - ${response.data}`);
    console.log('The webhook endpoint is working!');
    
  } catch (error) {
    console.error(`❌ Webhook error: ${error.response?.status || 'No response'}`);
    console.error(`Error: ${error.message}`);
    
    if (error.response?.status === 403) {
      console.log('\nThis is likely a signature verification error.');
      console.log('The webhook is working but rejecting due to missing/invalid signature.');
    } else if (error.response?.status === 500) {
      console.log('\nThis is a server error. Check your application logs.');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\nCannot connect to the webhook URL.');
      console.log('Make sure your server is running on the correct port.');
    }
  }
  
  // Test 2: Check if the server is running
  console.log('\n--- Test 2: Server connectivity ---');
  
  try {
    const healthResponse = await axios.get(`${baseUrl}/api/health`);
    console.log(`✅ Server is running: ${healthResponse.status}`);
    console.log(`Response: ${JSON.stringify(healthResponse.data)}`);
  } catch (error) {
    console.error(`❌ Server not accessible: ${error.message}`);
    console.log('Make sure your server is running and accessible.');
  }
  
  console.log('\n=== Analysis ===');
  console.log('\nThe issue with your SMS responses not appearing is likely:');
  console.log('\n1. **Virtual Number Problem**:');
  console.log('   - Your virtual number +19104442405 is probably not a real Twilio number');
  console.log('   - Twilio can only send webhooks for numbers you own');
  console.log('   - You need to purchase additional Twilio numbers for virtual numbers');
  
  console.log('\n2. **Webhook Configuration**:');
  console.log('   - Twilio needs to know where to send webhooks');
  console.log('   - Each phone number must be configured with webhook URLs');
  console.log('   - Virtual numbers must be real Twilio numbers with webhooks');
  
  console.log('\n3. **Solution Options**:');
  console.log('\n   Option A: Use your main Twilio number for all messaging');
  console.log('   - Configure webhooks for your main number only');
  console.log('   - Send all messages from your main number');
  console.log('   - Simpler but less personal');
  
  console.log('\n   Option B: Purchase additional Twilio numbers');
  console.log('   - Buy more phone numbers in your Twilio account');
  console.log('   - Assign real Twilio numbers as virtual numbers');
  console.log('   - Configure webhooks for each number');
  console.log('   - More expensive but more personal');
  
  console.log('\n   Option C: Use a single number with sender identification');
  console.log('   - Send all messages from your main Twilio number');
  console.log('   - Include sender name in message body');
  console.log('   - Configure webhooks only for main number');
  console.log('   - Most cost-effective solution');
  
  console.log('\n=== Next Steps ===');
  console.log('\n1. Check your Twilio Console:');
  console.log('   - Go to https://console.twilio.com');
  console.log('   - Check what phone numbers you own');
  console.log('   - Verify webhook configuration for your main number');
  
  console.log('\n2. Test with your main number:');
  console.log('   - Try sending messages to your main Twilio number');
  console.log('   - See if those responses appear in the conversation');
  
  console.log('\n3. Consider the solution options above');
}

testWebhookSimple().catch(console.error); 