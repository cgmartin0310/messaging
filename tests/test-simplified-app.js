const { sequelize, User, Contact, Conversation, ConversationParticipant } = require('./models');

async function testSimplifiedApp() {
  try {
    console.log('🧪 Testing Simplified App Structure...\n');

    // Test database connection
    console.log('1. Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connected successfully\n');

    // Sync models
    console.log('2. Syncing models...');
    await sequelize.sync({ alter: true });
    console.log('✅ Models synchronized\n');

    // Create test users
    console.log('3. Creating test users...');
    const user1 = await User.create({
      username: 'john_doe',
      email: 'john@example.com',
      phoneNumber: '+1234567890',
      firstName: 'John',
      lastName: 'Doe',
      password: 'password123'
    });

    const user2 = await User.create({
      username: 'jane_smith',
      email: 'jane@example.com',
      phoneNumber: '+1234567891',
      firstName: 'Jane',
      lastName: 'Smith',
      password: 'password123'
    });

    console.log('✅ Test users created\n');

    // Create test contacts
    console.log('4. Creating test contacts...');
    
    // Internal contact (from user)
    const internalContact = await Contact.createFromUser(user2);
    console.log('✅ Internal contact created:', internalContact.getDisplayName());

    // External contact (SMS)
    const externalContact = await Contact.createExternalContact({
      firstName: 'Bob',
      lastName: 'Wilson',
      phoneNumber: '+1987654321',
      displayName: 'Bob Wilson',
      email: 'bob@external.com',
      notes: 'External contact for SMS testing'
    });
    console.log('✅ External contact created:', externalContact.getDisplayName());

    console.log('\n📋 Contact Summary:');
    const allContacts = await Contact.findAll({
      include: [{ model: User, as: 'user' }]
    });
    
    allContacts.forEach(contact => {
      console.log(`- ${contact.getDisplayName()} (${contact.contactType})`);
      if (contact.contactType === 'internal') {
        console.log(`  User: ${contact.user.firstName} ${contact.user.lastName}`);
      } else {
        console.log(`  Phone: ${contact.phoneNumber}`);
      }
    });

    // Test conversation creation
    console.log('\n5. Testing conversation creation...');
    
    // User-to-user conversation
    const userToUserConv = await Conversation.createUserToUserConversation(
      user1.id,
      user2.id,
      `${user2.firstName} ${user2.lastName}`
    );
    console.log('✅ User-to-user conversation created:', userToUserConv.name);

    // User-to-SMS conversation
    const userToSmsConv = await Conversation.createDirectConversation(
      user1.id,
      externalContact.phoneNumber,
      externalContact.displayName
    );
    console.log('✅ User-to-SMS conversation created:', userToSmsConv.name);

    console.log('\n💬 Conversation Summary:');
    const allConversations = await Conversation.findAll({
      include: [{ model: ConversationParticipant, as: 'participants' }]
    });
    
    allConversations.forEach(conv => {
      console.log(`- ${conv.name} (${conv.conversationType})`);
      conv.participants.forEach(participant => {
        console.log(`  Participant: ${participant.displayName} (${participant.participantType})`);
      });
    });

    console.log('\n🎉 Simplified app structure test completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Users: ${await User.count()}`);
    console.log(`- Contacts: ${await Contact.count()}`);
    console.log(`- Conversations: ${await Conversation.count()}`);
    console.log(`- Participants: ${await ConversationParticipant.count()}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await sequelize.close();
  }
}

testSimplifiedApp(); 