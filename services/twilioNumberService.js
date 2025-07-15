const { User } = require('../models');
const twilioService = require('./twilioService'); // Assuming twilioService.js is in the same directory

class TwilioNumberService {
  constructor() {
    this.availableNumbers = new Set();
    this.assignedNumbers = new Map(); // userId -> phoneNumber
    // Load numbers asynchronously
    this.loadNumbers().catch(error => {
      console.error('Error loading Twilio numbers:', error);
    });
  }

  // Load available Twilio numbers from environment or database
  async loadNumbers() {
    try {
      // Start with your main Twilio number
      const mainNumber = process.env.TWILIO_PHONE_NUMBER;
      if (mainNumber) {
        this.availableNumbers.add(mainNumber);
        console.log(`Loaded main Twilio number: ${mainNumber}`);
      }

      // Load additional numbers from environment (comma-separated)
      const additionalNumbers = process.env.TWILIO_ADDITIONAL_NUMBERS;
      if (additionalNumbers) {
        const numbers = additionalNumbers.split(',').map(n => n.trim());
        numbers.forEach(number => {
          if (number) {
            this.availableNumbers.add(number);
            console.log(`Loaded additional Twilio number: ${number}`);
          }
        });
      }

      // Load assigned numbers from database
      const usersWithNumbers = await User.findAll({
        where: { virtualPhoneNumber: { [require('sequelize').Op.ne]: null } },
        attributes: ['id', 'virtualPhoneNumber']
      });

      usersWithNumbers.forEach(user => {
        this.assignedNumbers.set(user.id, user.virtualPhoneNumber);
        this.availableNumbers.delete(user.virtualPhoneNumber); // Remove from available
      });

      console.log(`Loaded ${this.availableNumbers.size} available Twilio numbers`);
      console.log(`Loaded ${this.assignedNumbers.size} assigned numbers`);
    } catch (error) {
      console.error('Error loading Twilio numbers:', error);
    }
  }

  // Add a new Twilio number to the pool
  async addNumber(phoneNumber) {
    try {
      // Clean and validate phone number format
      let cleanNumber = phoneNumber.trim();
      
      // Remove any non-digit characters except +
      cleanNumber = cleanNumber.replace(/[^\d+]/g, '');
      
      // Ensure it starts with +1
      if (!cleanNumber.startsWith('+1')) {
        if (cleanNumber.startsWith('1')) {
          cleanNumber = '+' + cleanNumber;
        } else if (cleanNumber.startsWith('+')) {
          // Already has +, just ensure it's +1
          if (!cleanNumber.startsWith('+1')) {
            cleanNumber = '+1' + cleanNumber.substring(1);
          }
        } else {
          // Add +1 prefix
          cleanNumber = '+1' + cleanNumber;
        }
      }
      
      // Validate final format (must be +1 followed by exactly 10 digits)
      if (!cleanNumber.match(/^\+1[0-9]{10}$/)) {
        throw new Error(`Invalid phone number format. Expected +1XXXXXXXXXX, got: ${cleanNumber}`);
      }

      // Check if number is already assigned
      const existingUser = await User.findOne({
        where: { virtualPhoneNumber: cleanNumber }
      });

      if (existingUser) {
        throw new Error('Phone number is already assigned to a user');
      }

      this.availableNumbers.add(cleanNumber);
      console.log(`Added Twilio number: ${cleanNumber}`);
      
      return {
        success: true,
        message: 'Twilio number added successfully',
        number: cleanNumber
      };
    } catch (error) {
      console.error('Error adding Twilio number:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Remove a Twilio number from the pool
  async removeNumber(phoneNumber) {
    try {
      // Check if number is assigned to a user
      const assignedUser = await User.findOne({
        where: { virtualPhoneNumber: phoneNumber }
      });

      if (assignedUser) {
        throw new Error('Cannot remove number that is assigned to a user');
      }

      this.availableNumbers.delete(phoneNumber);
      console.log(`Removed Twilio number: ${phoneNumber}`);
      
      return {
        success: true,
        message: 'Twilio number removed successfully',
        number: phoneNumber
      };
    } catch (error) {
      console.error('Error removing Twilio number:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Assign a number to a user
  async assignNumberToUser(userId, phoneNumber) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      if (user.virtualPhoneNumber) {
        return {
          success: true,
          message: 'User already has a virtual number'
        };
      }
      
      // Configure webhook for this number
      await this.configureWebhook(phoneNumber);
      
      // Update user with virtual phone number
      await user.update({ virtualPhoneNumber: phoneNumber });
      
      // Update internal state
      this.assignedNumbers.set(phoneNumber, userId);
      this.availableNumbers.delete(phoneNumber);
      
      console.log(`Assigned ${phoneNumber} to user ${user.username}`);
      console.log(`Available numbers left: ${this.availableNumbers.size}`);
      
      return {
        success: true,
        message: 'Number assigned successfully'
      };
    } catch (error) {
      console.error('Error assigning number:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Configure webhook for a phone number
  async configureWebhook(phoneNumber) {
    try {
      const webhookUrl = `${process.env.BASE_URL}/api/webhooks/twilio/incoming`;
      
      await twilioService.client.incomingPhoneNumbers
        .list({ phoneNumber: phoneNumber })
        .then(numbers => {
          if (numbers.length > 0) {
            const numberSid = numbers[0].sid;
            return twilioService.client.incomingPhoneNumbers(numberSid)
              .update({
                smsUrl: webhookUrl,
                smsMethod: 'POST'
              });
          } else {
            throw new Error(`Phone number ${phoneNumber} not found in Twilio account`);
          }
        });
      
      console.log(`Configured webhook for ${phoneNumber} to ${webhookUrl}`);
    } catch (error) {
      console.error('Error configuring webhook:', error);
      throw error;
    }
  }

  // Get available Twilio numbers
  getAvailableNumbers() {
    return Array.from(this.availableNumbers);
  }

  // Reload numbers from environment and database
  async reloadNumbers() {
    this.availableNumbers.clear();
    this.assignedNumbers.clear();
    await this.loadNumbers();
  }

  // Get assigned numbers
  getAssignedNumbers() {
    return Array.from(this.assignedNumbers.entries()).map(([userId, number]) => ({
      userId,
      number
    }));
  }

  // Get all numbers (available + assigned)
  getAllNumbers() {
    return {
      available: this.getAvailableNumbers(),
      assigned: this.getAssignedNumbers()
    };
  }

  // Check if a number is available
  isNumberAvailable(phoneNumber) {
    return this.availableNumbers.has(phoneNumber);
  }

  // Get user's assigned number
  getUserNumber(userId) {
    return this.assignedNumbers.get(userId);
  }
}

module.exports = new TwilioNumberService(); 