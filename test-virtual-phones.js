const virtualPhoneService = require('./services/virtualPhoneService');
const { User } = require('./models');
require('dotenv').config();

// Function to test virtual phone number system
async function testVirtualPhoneSystem() {
  console.log('=== Virtual Phone Number System Test ===');
  
  console.log('\n--- Configuration Check ---');
  console.log(`TWILIO_ACCOUNT_SID: ${process.env.TWILIO_ACCOUNT_SID ? 'Set' : 'Not set'}`);
  console.log(`TWILIO_AUTH_TOKEN: ${process.env.TWILIO_AUTH_TOKEN ? 'Set' : 'Not set'}`);
  console.log(`TWILIO_PHONE_NUMBER: ${process.env.TWILIO_PHONE_NUMBER || 'Not set'}`);
  
  if (!process.env.TWILIO_PHONE_NUMBER) {
    console.log('\n❌ TWILIO_PHONE_NUMBER not set!');
    console.log('   This is required for generating virtual phone numbers.');
    return;
  }
  
  console.log('\n--- Testing Virtual Phone Number System ---');
  
  try {
    // Test 1: Create test users
    console.log('\n1. Creating test users...');
    const user1 = await User.create({
      username: 'testuser1',
      email: 'test1@example.com',
      password: 'hashedpassword',
      firstName: 'John',
      lastName: 'Doe'
    });
    
    const user2 = await User.create({
      username: 'testuser2',
      email: 'test2@example.com',
      password: 'hashedpassword',
      firstName: 'Jane',
      lastName: 'Smith'
    });
    
    console.log('✅ Test users created');
    console.log(`   User 1: ${user1.username} (${user1.id})`);
    console.log(`   User 2: ${user2.username} (${user2.id})`);
    
    // Test 2: Assign virtual numbers
    console.log('\n2. Assigning virtual phone numbers...');
    const result1 = await virtualPhoneService.assignVirtualNumber(user1.id);
    const result2 = await virtualPhoneService.assignVirtualNumber(user2.id);
    
    if (result1.success && result2.success) {
      console.log('✅ Virtual numbers assigned successfully');
      console.log(`   ${user1.username}: ${result1.virtualNumber}`);
      console.log(`   ${user2.username}: ${result2.virtualNumber}`);
      
      // Test 3: Send SMS between internal users
      console.log('\n3. Testing internal SMS...');
      const smsResult = await virtualPhoneService.sendInternalSMS(
        user1.id,
        user2.id,
        'Hello from John! This is a test message between internal users.'
      );
      
      if (smsResult.success) {
        console.log('✅ Internal SMS sent successfully');
        console.log(`   From: ${smsResult.from}`);
        console.log(`   To: ${smsResult.to}`);
        console.log(`   Message ID: ${smsResult.messageId}`);
        
        // Test 4: Send SMS to external number
        console.log('\n4. Testing external SMS...');
        const externalResult = await virtualPhoneService.sendExternalSMS(
          user1.id,
          '+18777804236', // Your test number
          'Hello from John! This is a test message to an external number.'
        );
        
        if (externalResult.success) {
          console.log('✅ External SMS sent successfully');
          console.log(`   From: ${externalResult.from}`);
          console.log(`   To: ${externalResult.to}`);
          console.log(`   Message ID: ${externalResult.messageId}`);
        } else {
          console.log('❌ External SMS failed');
          console.log(`   Error: ${externalResult.error}`);
        }
        
      } else {
        console.log('❌ Internal SMS failed');
        console.log(`   Error: ${smsResult.error}`);
      }
      
      // Test 5: Simulate incoming SMS
      console.log('\n5. Testing incoming SMS handling...');
      const incomingResult = await virtualPhoneService.handleIncomingSMS(
        result2.virtualNumber, // From Jane's virtual number
        result1.virtualNumber, // To John's virtual number
        'Hello John! This is Jane replying to your message.'
      );
      
      if (incomingResult.success) {
        console.log('✅ Incoming SMS handled successfully');
        console.log(`   Recipient: ${incomingResult.recipientUserId}`);
        console.log(`   Sender: ${incomingResult.senderName}`);
        console.log(`   Message: ${incomingResult.message}`);
      } else {
        console.log('❌ Incoming SMS handling failed');
        console.log(`   Error: ${incomingResult.error}`);
      }
      
      // Test 6: Get users with virtual numbers
      console.log('\n6. Getting users with virtual numbers...');
      const usersWithNumbers = await virtualPhoneService.getUsersWithVirtualNumbers();
      console.log('✅ Users with virtual numbers:');
      usersWithNumbers.forEach(user => {
        console.log(`   ${user.firstName} ${user.lastName}: ${user.virtualPhoneNumber}`);
      });
      
    } else {
      console.log('❌ Failed to assign virtual numbers');
      console.log(`   User 1: ${result1.error}`);
      console.log(`   User 2: ${result2.error}`);
    }
    
    // Cleanup: Remove test users
    console.log('\n7. Cleaning up test users...');
    await user1.destroy();
    await user2.destroy();
    console.log('✅ Test users removed');
    
  } catch (error) {
    console.error('Error testing virtual phone system:', error);
  }
}

// Function to explain the concept
function explainVirtualPhoneConcept() {
  console.log('\n=== Virtual Phone Number Concept ===');
  
  console.log('\n🎯 The Idea:');
  console.log('   - Every internal user gets a virtual phone number');
  console.log('   - All messaging goes through SMS (even between web users)');
  console.log('   - Unified experience - everyone uses the same channel');
  console.log('   - Simpler architecture - no complex Conversations API needed');
  
  console.log('\n📱 How It Works:');
  console.log('   1. User A (web) sends message to User B (web)');
  console.log('   2. System sends SMS from User A\'s virtual number to User B\'s virtual number');
  console.log('   3. User B receives SMS on their phone');
  console.log('   4. User B replies via SMS');
  console.log('   5. System receives SMS and shows it in User A\'s web app');
  
  console.log('\n✅ Benefits:');
  console.log('   - SMS users CAN reply back to web users');
  console.log('   - Unified messaging experience');
  console.log('   - Works with traditional SMS API (simpler)');
  console.log('   - No complex Conversations API setup needed');
  console.log('   - Real-time web updates via webhooks');
  
  console.log('\n💰 Cost:');
  console.log('   - Only SMS costs (~$0.0075 per message)');
  console.log('   - No Conversations API fees');
  console.log('   - Much simpler and cheaper than Conversations API');
}

// Main execution
async function main() {
  explainVirtualPhoneConcept();
  await testVirtualPhoneSystem();
  
  console.log('\n=== Next Steps ===');
  console.log('1. Add virtual phone number field to User model');
  console.log('2. Create virtual phone number assignment system');
  console.log('3. Update webhook handler to route messages to virtual numbers');
  console.log('4. Add Socket.IO integration for real-time web updates');
  console.log('5. Test with real phone numbers');
}

main(); 