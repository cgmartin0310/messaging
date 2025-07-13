const twilioService = require('./services/twilioService');
require('dotenv').config();

// Function to test Conversations API setup
async function testConversationsAPI() {
  console.log('=== Twilio Conversations API Test ===');
  
  console.log('\n--- Configuration Check ---');
  console.log(`TWILIO_ACCOUNT_SID: ${process.env.TWILIO_ACCOUNT_SID ? 'Set' : 'Not set'}`);
  console.log(`TWILIO_AUTH_TOKEN: ${process.env.TWILIO_AUTH_TOKEN ? 'Set' : 'Not set'}`);
  console.log(`TWILIO_PHONE_NUMBER: ${process.env.TWILIO_PHONE_NUMBER || 'Not set'}`);
  console.log(`TWILIO_CONVERSATIONS_SERVICE_SID: ${process.env.TWILIO_CONVERSATIONS_SERVICE_SID || 'Not set'}`);
  
  if (!process.env.TWILIO_CONVERSATIONS_SERVICE_SID) {
    console.log('\n❌ TWILIO_CONVERSATIONS_SERVICE_SID not set!');
    console.log('   This is REQUIRED for bidirectional SMS messaging.');
    console.log('   Please create a Conversations Service in Twilio Console and add the SID to your .env file.');
    console.log('   See TWILIO_CONVERSATIONS_SETUP.md for detailed instructions.');
    return;
  }
  
  console.log('\n--- Testing Conversations API ---');
  
  try {
    // Test 1: Create a conversation
    console.log('\n1. Creating test conversation...');
    const conversationResult = await twilioService.createOrGetConversation(
      'test-conversation-' + Date.now(),
      'Test Conversation'
    );
    
    if (conversationResult.success) {
      console.log('✅ Conversation created successfully');
      console.log(`   Conversation ID: ${conversationResult.conversationId}`);
      
      // Test 2: Add web participant
      console.log('\n2. Adding web participant...');
      const webParticipantResult = await twilioService.addParticipant(
        conversationResult.conversationId,
        'web-user-test',
        {
          displayName: 'Test Web User',
          phoneNumber: '+1234567890'
        }
      );
      
      if (webParticipantResult.success) {
        console.log('✅ Web participant added successfully');
        console.log(`   Participant ID: ${webParticipantResult.participantId}`);
        
        // Test 3: Add SMS participant
        console.log('\n3. Adding SMS participant...');
        const smsParticipantResult = await twilioService.addSMSParticipant(
          conversationResult.conversationId,
          '+18777804236', // Your test number
          {
            displayName: 'Test SMS User',
            phoneNumber: '+18777804236'
          }
        );
        
        if (smsParticipantResult.success) {
          console.log('✅ SMS participant added successfully');
          console.log(`   Participant ID: ${smsParticipantResult.participantId}`);
          
          // Test 4: Send message to conversation
          console.log('\n4. Sending test message...');
          const messageResult = await twilioService.sendMessage(
            conversationResult.conversationId,
            'web-user-test',
            'Hello from Conversations API! This message should be delivered via SMS.',
            {
              messageType: 'text',
              senderName: 'Test Web User'
            }
          );
          
          if (messageResult.success) {
            console.log('✅ Message sent successfully');
            console.log(`   Message ID: ${messageResult.messageId}`);
            
            console.log('\n🎉 Conversations API is working correctly!');
            console.log('\n--- What happens next ---');
            console.log('1. The SMS user should receive this message');
            console.log('2. When they reply, it will come back to your webhook');
            console.log('3. The reply will appear in your web app in real-time');
            console.log('4. Both web and SMS users will see the full conversation');
            
          } else {
            console.log('❌ Failed to send message');
            console.log(`   Error: ${messageResult.error}`);
          }
          
        } else {
          console.log('❌ Failed to add SMS participant');
          console.log(`   Error: ${smsParticipantResult.error}`);
        }
        
      } else {
        console.log('❌ Failed to add web participant');
        console.log(`   Error: ${webParticipantResult.error}`);
      }
      
    } else {
      console.log('❌ Failed to create conversation');
      console.log(`   Error: ${conversationResult.error}`);
    }
    
  } catch (error) {
    console.error('Error testing Conversations API:', error.message);
  }
}

// Function to compare with traditional SMS
async function compareWithTraditionalSMS() {
  console.log('\n=== Comparison: Conversations vs Traditional SMS ===');
  
  console.log('\n📱 Traditional SMS API (your curl command):');
  console.log('   ✅ Simple to send SMS');
  console.log('   ❌ SMS users CANNOT reply back to web users');
  console.log('   ❌ No conversation management');
  console.log('   ❌ No unified messaging experience');
  
  console.log('\n💬 Conversations API (your app\'s design):');
  console.log('   ✅ SMS users CAN reply back to web users');
  console.log('   ✅ Unified conversation across web and SMS');
  console.log('   ✅ Real-time updates for web users');
  console.log('   ✅ Built-in conversation management');
  
  console.log('\n🎯 Recommendation:');
  console.log('   Use Conversations API for bidirectional messaging');
  console.log('   Use Traditional SMS API only for one-way notifications');
}

// Main execution
async function main() {
  await testConversationsAPI();
  await compareWithTraditionalSMS();
  
  console.log('\n=== Next Steps ===');
  console.log('1. If Conversations API test failed, create a Conversations Service in Twilio Console');
  console.log('2. Add TWILIO_CONVERSATIONS_SERVICE_SID to your .env file');
  console.log('3. Test with a real phone number');
  console.log('4. Deploy with webhook URL for production');
  console.log('\nSee TWILIO_CONVERSATIONS_SETUP.md for detailed instructions.');
}

main(); 