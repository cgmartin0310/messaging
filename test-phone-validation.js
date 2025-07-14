require('dotenv').config();
const twilioNumberService = require('./services/twilioNumberService');

async function testPhoneValidation() {
  console.log('=== Testing Phone Number Validation ===\n');
  
  const testNumbers = [
    '+19104442405',      // Correct format
    '9104442405',        // Missing +1
    '19104442405',       // Missing +
    '+1-910-444-2405',   // With dashes
    '+1 (910) 444-2405', // With parentheses and spaces
    '910-444-2405',      // With dashes, missing +1
    '+1910444240',       // Too short
    '+191044424050',     // Too long
    'invalid',           // Invalid
    '  +19104442405  '  // With whitespace
  ];
  
  for (const number of testNumbers) {
    console.log(`Testing: "${number}"`);
    try {
      const result = await twilioNumberService.addNumber(number);
      if (result.success) {
        console.log(`✅ SUCCESS: "${number}" -> "${result.number}"`);
      } else {
        console.log(`❌ FAILED: ${result.error}`);
      }
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
    }
    console.log('');
  }
  
  console.log('=== Test Complete ===');
}

testPhoneValidation().catch(console.error); 