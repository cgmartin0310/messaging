const twilioNumberService = require('./services/twilioNumberService');
const virtualPhoneService = require('./services/virtualPhoneService');
require('dotenv').config();

async function testTwilioNumbers() {
  console.log('=== Testing Twilio Number System ===');
  
  console.log('\n--- Environment Check ---');
  console.log(`TWILIO_PHONE_NUMBER: ${process.env.TWILIO_PHONE_NUMBER || 'Not set'}`);
  console.log(`TWILIO_ADDITIONAL_NUMBERS: ${process.env.TWILIO_ADDITIONAL_NUMBERS || 'Not set'}`);
  
  if (!process.env.TWILIO_PHONE_NUMBER) {
    console.log('\n❌ TWILIO_PHONE_NUMBER not set!');
    console.log('   Please set this environment variable to your Twilio number (e.g., +19104442405)');
    return;
  }
  
  console.log('\n--- Loading Twilio Numbers ---');
  
  try {
    // Reload numbers
    await twilioNumberService.reloadNumbers();
    
    // Check available numbers
    const availableNumbers = twilioNumberService.getAvailableNumbers();
    console.log(`Available numbers: ${availableNumbers.length}`);
    availableNumbers.forEach(number => {
      console.log(`  - ${number}`);
    });
    
    // Check assigned numbers
    const assignedNumbers = twilioNumberService.getAssignedNumbers();
    console.log(`Assigned numbers: ${assignedNumbers.length}`);
    assignedNumbers.forEach(assignment => {
      console.log(`  - ${assignment.number} (User: ${assignment.userId})`);
    });
    
    if (availableNumbers.length === 0) {
      console.log('\n⚠️  No available numbers found!');
      console.log('   Adding main Twilio number to pool...');
      
      const result = await twilioNumberService.addNumber(process.env.TWILIO_PHONE_NUMBER);
      if (result.success) {
        console.log(`✅ Added ${result.number} to pool`);
      } else {
        console.log(`❌ Failed to add number: ${result.error}`);
      }
    } else {
      console.log('\n✅ Twilio numbers loaded successfully!');
    }
    
  } catch (error) {
    console.error('Error testing Twilio numbers:', error);
  }
}

// Run the test
testTwilioNumbers(); 