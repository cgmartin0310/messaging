const { User } = require('../models');

class TwilioNumberService {
  constructor() {
    this.availableNumbers = new Set();
    this.assignedNumbers = new Map(); // userId -> phoneNumber
    this.loadNumbers();
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
      // Validate phone number format
      if (!phoneNumber.match(/^\+1[0-9]{10}$/)) {
        throw new Error('Invalid phone number format. Must be +1XXXXXXXXXX');
      }

      // Check if number is already assigned
      const existingUser = await User.findOne({
        where: { virtualPhoneNumber: phoneNumber }
      });

      if (existingUser) {
        throw new Error('Phone number is already assigned to a user');
      }

      this.availableNumbers.add(phoneNumber);
      console.log(`Added Twilio number: ${phoneNumber}`);
      
      return {
        success: true,
        message: 'Twilio number added successfully',
        number: phoneNumber
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

  // Assign a Twilio number to a user
  async assignNumberToUser(userId, phoneNumber) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Validate phone number format
      if (!phoneNumber.match(/^\+1[0-9]{10}$/)) {
        throw new Error('Invalid phone number format. Must be +1XXXXXXXXXX');
      }

      // Check if number is available
      if (!this.availableNumbers.has(phoneNumber)) {
        throw new Error('Phone number is not available or already assigned');
      }

      // Check if user already has a number
      if (user.virtualPhoneNumber) {
        // Remove old number from assigned list
        this.assignedNumbers.delete(userId);
        this.availableNumbers.add(user.virtualPhoneNumber);
      }

      // Assign new number
      await user.update({ virtualPhoneNumber: phoneNumber });
      this.assignedNumbers.set(userId, phoneNumber);
      this.availableNumbers.delete(phoneNumber);

      console.log(`Assigned ${phoneNumber} to user ${user.username}`);
      
      return {
        success: true,
        message: 'Twilio number assigned successfully',
        number: phoneNumber
      };
    } catch (error) {
      console.error('Error assigning Twilio number:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get available Twilio numbers
  getAvailableNumbers() {
    return Array.from(this.availableNumbers);
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