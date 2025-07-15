const sequelize = require('./config/database');
const { ConversationParticipant } = require('./models');

async function fixPhoneNumbers() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Connected successfully');
    
    // Find all participants with phone numbers
    const participants = await ConversationParticipant.findAll({
      where: {
        phoneNumber: {
          [sequelize.Sequelize.Op.not]: null
        }
      }
    });
    
    console.log(`Found ${participants.length} participants with phone numbers`);
    
    let updated = 0;
    for (const participant of participants) {
      // Check if phone number already has + prefix
      if (!participant.phoneNumber.startsWith('+')) {
        const oldNumber = participant.phoneNumber;
        const newNumber = `+${participant.phoneNumber}`;
        
        await participant.update({ phoneNumber: newNumber });
        console.log(`Updated: ${oldNumber} -> ${newNumber}`);
        updated++;
      }
    }
    
    console.log(`\nUpdated ${updated} phone numbers`);
    console.log('Phone number fix complete!');
    
  } catch (error) {
    console.error('Error fixing phone numbers:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the fix
fixPhoneNumbers(); 