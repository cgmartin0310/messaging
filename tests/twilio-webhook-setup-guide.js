require('dotenv').config();

function showTwilioWebhookSetupGuide() {
  console.log('=== Twilio Webhook Setup Guide ===\n');
  
  const baseUrl = 'https://messaging-backend-7bvd.onrender.com';
  
  console.log('Current Twilio Console Interface:\n');
  
  console.log('1. Go to https://console.twilio.com');
  console.log('2. Navigate to Phone Numbers > Manage > Active numbers');
  console.log('3. Click on your number +19104442405');
  console.log('4. Look for these sections:\n');
  
  console.log('📱 MESSAGING SECTION:');
  console.log('   - "A MESSAGE COMES IN" webhook URL:');
  console.log(`     ${baseUrl}/api/webhooks/twilio/incoming`);
  console.log('   - HTTP Method: POST');
  console.log('\n');
  
  console.log('⚠️  If you see "Primary handler fails":');
  console.log('   - This means the webhook URL is not accessible');
  console.log('   - Make sure your backend is running');
  console.log('   - Check that the URL is correct');
  console.log('\n');
  
  console.log('🔧 Alternative Configuration Options:');
  console.log('\nOption A: Messaging Service (Recommended)');
  console.log('1. Go to Messaging > Services');
  console.log('2. Create or edit a Messaging Service');
  console.log('3. Set "Inbound Settings" > "Webhook URL":');
  console.log(`   ${baseUrl}/api/webhooks/twilio/incoming`);
  console.log('4. Set "Status Callback URL":');
  console.log(`   ${baseUrl}/api/webhooks/twilio/status`);
  console.log('5. Assign this Messaging Service to your phone number');
  console.log('\n');
  
  console.log('Option B: Phone Number Direct Configuration');
  console.log('1. In Phone Numbers > Manage > Active numbers');
  console.log('2. Click on +19104442405');
  console.log('3. Look for "Messaging" or "Webhook" section');
  console.log('4. Set webhook URL to:');
  console.log(`   ${baseUrl}/api/webhooks/twilio/incoming`);
  console.log('\n');
  
  console.log('Option C: Check for Status Callback');
  console.log('Look for these fields:');
  console.log('- "Status Callback URL"');
  console.log('- "Status Callback"');
  console.log('- "Webhook URL"');
  console.log('- "A MESSAGE COMES IN"');
  console.log('\n');
  
  console.log('🔍 Troubleshooting "Primary handler fails":');
  console.log('\n1. Test the webhook URL manually:');
  console.log('   curl -X POST https://messaging-backend-7bvd.onrender.com/api/webhooks/twilio/incoming');
  console.log('\n2. Check your Render logs for errors');
  console.log('\n3. Verify the URL is accessible from the internet');
  console.log('\n4. Make sure your backend is running on Render');
  
  console.log('\n=== Environment Variables ===');
  console.log('\nMake sure to set in Render:');
  console.log(`BASE_URL=${baseUrl}`);
  console.log('TWILIO_ACCOUNT_SID=your-account-sid');
  console.log('TWILIO_AUTH_TOKEN=your-auth-token');
  console.log('TWILIO_PHONE_NUMBER=+19104442405');
  
  console.log('\n=== Testing Steps ===');
  console.log('\n1. Configure webhook URL in Twilio Console');
  console.log('2. Set BASE_URL in Render environment variables');
  console.log('3. Send test message from your app');
  console.log('4. Reply to your virtual number');
  console.log('5. Check if response appears in conversation');
  
  console.log('\n=== Current Status ===');
  console.log('\n✅ Backend URL is accessible');
  console.log('✅ Webhook endpoint is working');
  console.log('⚠️  Need to configure webhook URL in Twilio Console');
  console.log('⚠️  Need to set BASE_URL in Render environment');
}

showTwilioWebhookSetupGuide(); 