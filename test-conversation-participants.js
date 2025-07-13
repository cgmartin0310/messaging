const { Conversation, ConversationParticipant, User } = require('./models');
const virtualPhoneService = require('./services/virtualPhoneService');
require('dotenv').config();

// Function to test conversation participant management
async function testConversationParticipants() {
  console.log('=== Conversation Participant Management Test ===');
  
  console.log('\n--- Configuration Check ---');
  console.log(`TWILIO_ACCOUNT_SID: ${process.env.TWILIO_ACCOUNT_SID ? 'Set' : 'Not set'}`);
  console.log(`TWILIO_AUTH_TOKEN: ${process.env.TWILIO_AUTH_TOKEN ? 'Set' : 'Not set'}`);
  console.log(`TWILIO_PHONE_NUMBER: ${process.env.TWILIO_PHONE_NUMBER || 'Not set'}`);
  
  if (!process.env.TWILIO_PHONE_NUMBER) {
    console.log('\n❌ TWILIO_PHONE_NUMBER not set!');
    console.log('   This is required for generating virtual phone numbers.');
    return;
  }
  
  console.log('\n--- Testing Conversation Participant Management ---');
  
  try {
    // Test 1: Create test users
    console.log('\n1. Creating test users...');
    const user1 = await User.create({
      username: 'adminuser',
      email: 'admin@example.com',
      password: 'hashedpassword',
      firstName: 'Admin',
      lastName: 'User'
    });
    
    const user2 = await User.create({
      username: 'memberuser1',
      email: 'member1@example.com',
      password: 'hashedpassword',
      firstName: 'Member',
      lastName: 'One'
    });
    
    const user3 = await User.create({
      username: 'memberuser2',
      email: 'member2@example.com',
      password: 'hashedpassword',
      firstName: 'Member',
      lastName: 'Two'
    });
    
    console.log('✅ Test users created');
    console.log(`   Admin: ${user1.username} (${user1.id})`);
    console.log(`   Member 1: ${user2.username} (${user2.id})`);
    console.log(`   Member 2: ${user3.username} (${user3.id})`);
    
    // Test 2: Create group conversation
    console.log('\n2. Creating group conversation...');
    const conversation = await Conversation.createGroupConversation(
      user1.id,
      'Test Group',
      'A test group conversation',
      [user2.id, user3.id]
    );
    
    console.log('✅ Group conversation created');
    console.log(`   Conversation ID: ${conversation.id}`);
    console.log(`   Name: ${conversation.name}`);
    console.log(`   Type: ${conversation.conversationType}`);
    
    // Test 3: Get conversation participants
    console.log('\n3. Getting conversation participants...');
    const participants = await conversation.getParticipants();
    console.log('✅ Participants:');
    participants.forEach(p => {
      console.log(`   - ${p.displayName} (${p.participantType}) - ${p.role}`);
    });
    
    // Test 4: Add new participant
    console.log('\n4. Adding new participant...');
    const newUser = await User.create({
      username: 'newuser',
      email: 'new@example.com',
      password: 'hashedpassword',
      firstName: 'New',
      lastName: 'User'
    });
    
    const addResult = await conversation.addParticipant(
      newUser.id,
      'virtual',
      `${newUser.firstName} ${newUser.lastName}`
    );
    
    if (addResult.success) {
      console.log('✅ New participant added successfully');
      console.log(`   Participant ID: ${addResult.participantId}`);
      console.log(`   Virtual Number: ${addResult.virtualNumber}`);
    } else {
      console.log('❌ Failed to add participant');
    }
    
    // Test 5: Add external SMS participant
    console.log('\n5. Adding external SMS participant...');
    const smsResult = await conversation.addParticipant(
      '+18777804236', // External phone number
      'sms',
      'External Contact'
    );
    
    if (smsResult.success) {
      console.log('✅ SMS participant added successfully');
      console.log(`   Phone Number: ${smsResult.phoneNumber}`);
    } else {
      console.log('❌ Failed to add SMS participant');
    }
    
    // Test 6: Get updated participants
    console.log('\n6. Getting updated participants...');
    const updatedParticipants = await conversation.getParticipants();
    console.log('✅ Updated participants:');
    updatedParticipants.forEach(p => {
      console.log(`   - ${p.displayName} (${p.participantType}) - ${p.role}`);
    });
    
    // Test 7: Remove participant
    console.log('\n7. Removing participant...');
    const removeResult = await conversation.removeParticipant(newUser.id);
    
    if (removeResult.success) {
      console.log('✅ Participant removed successfully');
      console.log(`   Participant ID: ${removeResult.participantId}`);
    } else {
      console.log('❌ Failed to remove participant');
    }
    
    // Test 8: Get final participants
    console.log('\n8. Getting final participants...');
    const finalParticipants = await conversation.getParticipants();
    console.log('✅ Final participants:');
    finalParticipants.forEach(p => {
      console.log(`   - ${p.displayName} (${p.participantType}) - ${p.role}`);
    });
    
    // Test 9: Send message to conversation
    console.log('\n9. Sending message to conversation...');
    const messageResult = await conversation.sendMessage(
      user1.id,
      'Hello everyone! This is a test message to the group.'
    );
    
    if (messageResult.message) {
      console.log('✅ Message sent successfully');
      console.log(`   Message ID: ${messageResult.message.id}`);
      console.log(`   SMS Results: ${messageResult.smsResults.length} SMS sent`);
    } else {
      console.log('❌ Failed to send message');
    }
    
    // Cleanup: Remove test users
    console.log('\n10. Cleaning up test users...');
    await user1.destroy();
    await user2.destroy();
    await user3.destroy();
    await newUser.destroy();
    console.log('✅ Test users removed');
    
  } catch (error) {
    console.error('Error testing conversation participants:', error);
  }
}

// Function to explain the participant management concept
function explainParticipantManagement() {
  console.log('\n=== Conversation Participant Management ===');
  
  console.log('\n🎯 The Concept:');
  console.log('   - Conversations can have multiple participants');
  console.log('   - Participants can be internal users (virtual numbers) or external SMS users');
  console.log('   - Admins can add/remove participants');
  console.log('   - Messages are sent to all participants via SMS');
  
  console.log('\n📱 Participant Types:');
  console.log('   - virtual: Internal users with virtual phone numbers');
  console.log('   - sms: External users with real phone numbers');
  
  console.log('\n👥 Roles:');
  console.log('   - admin: Can add/remove participants and send messages');
  console.log('   - member: Can send messages but cannot manage participants');
  
  console.log('\n🔄 Message Flow:');
  console.log('   1. User sends message to conversation');
  console.log('   2. System sends SMS to all participants (except sender)');
  console.log('   3. Internal users receive SMS on their virtual numbers');
  console.log('   4. External users receive SMS on their real numbers');
  console.log('   5. Replies come back through webhook and appear in web app');
  
  console.log('\n✅ Benefits:');
  console.log('   - Unified messaging across web and SMS');
  console.log('   - Group conversations with mixed participants');
  console.log('   - Real-time updates for web users');
  console.log('   - Simple SMS-based architecture');
}

// Main execution
async function main() {
  explainParticipantManagement();
  await testConversationParticipants();
  
  console.log('\n=== API Endpoints ===');
  console.log('POST /api/conversations/group - Create group conversation');
  console.log('POST /api/conversations/:id/participants - Add participant');
  console.log('DELETE /api/conversations/:id/participants/:participantId - Remove participant');
  console.log('GET /api/conversations/:id/participants - Get participants');
  console.log('POST /api/conversations/:id/messages - Send message');
  
  console.log('\n=== Next Steps ===');
  console.log('1. Test with real phone numbers');
  console.log('2. Add Socket.IO integration for real-time web updates');
  console.log('3. Implement message history and persistence');
  console.log('4. Add conversation settings and permissions');
  console.log('5. Deploy with webhook URL for production');
}

main(); 