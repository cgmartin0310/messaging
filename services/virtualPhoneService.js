const twilioService = require('./twilioService');
const { User } = require('../models');

class VirtualPhoneService {
  constructor() {
    this.baseNumber = process.env.TWILIO_PHONE_NUMBER;
    this.numberPool = new Set();
    // Load existing numbers asynchronously
    this.loadExistingNumbers().catch(error => {
      console.error('Error loading existing virtual numbers:', error);
    });
  }

  // Load existing virtual numbers from database
  async loadExistingNumbers() {
    try {
      const users = await User.findAll({
        where: { virtualPhoneNumber: { [require('sequelize').Op.ne]: null } },
        attributes: ['virtualPhoneNumber']
      });
      
      users.forEach(user => {
        if (user.virtualPhoneNumber) {
          this.numberPool.add(user.virtualPhoneNumber);
        }
      });
      
      console.log(`Loaded ${this.numberPool.size} existing virtual phone numbers`);
    } catch (error) {
      console.error('Error loading existing virtual numbers:', error);
    }
  }

  // Generate a virtual phone number for a user
  async assignVirtualNumber(userId) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // If user already has a virtual number, return it
      if (user.virtualPhoneNumber) {
        return {
          success: true,
          virtualNumber: user.virtualPhoneNumber,
          message: 'User already has a virtual number'
        };
      }

      // Check if base number is set
      if (!this.baseNumber) {
        throw new Error('TWILIO_PHONE_NUMBER environment variable not set');
      }

      // Generate a unique virtual number
      const virtualNumber = await this.generateUniqueNumber();
      
      // Assign to user
      await user.update({ virtualPhoneNumber: virtualNumber });
      
      console.log(`Assigned virtual number ${virtualNumber} to user ${user.username}`);
      
      return {
        success: true,
        virtualNumber: virtualNumber,
        message: 'Virtual number assigned successfully'
      };
    } catch (error) {
      console.error('Error assigning virtual number:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Generate a unique virtual phone number
  async generateUniqueNumber() {
    if (!this.baseNumber) {
      throw new Error('TWILIO_PHONE_NUMBER not set - cannot generate virtual numbers');
    }
    
    const maxAttempts = 100;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      // Generate a virtual number based on the base number
      // Format: +1XXXYYYZZZZ where XXX is area code, YYY is prefix, ZZZZ is unique
      const baseNumber = this.baseNumber.replace(/\D/g, '');
      const areaCode = baseNumber.substring(1, 4);
      const prefix = baseNumber.substring(4, 7);
      const uniquePart = Math.floor(Math.random() * 9000) + 1000; // 4-digit unique number
      
      const virtualNumber = `+1${areaCode}${prefix}${uniquePart}`;
      
      // Check if this number is already in use
      const existingUser = await User.findOne({
        where: { virtualPhoneNumber: virtualNumber }
      });
      
      if (!existingUser && !this.numberPool.has(virtualNumber)) {
        this.numberPool.add(virtualNumber);
        return virtualNumber;
      }
      
      attempts++;
    }
    
    throw new Error('Unable to generate unique virtual number after 100 attempts');
  }

  // Send SMS from one internal user to another
  async sendInternalSMS(fromUserId, toUserId, message) {
    try {
      const [fromUser, toUser] = await Promise.all([
        User.findByPk(fromUserId),
        User.findByPk(toUserId)
      ]);

      if (!fromUser || !toUser) {
        throw new Error('One or both users not found');
      }

      // Ensure both users have virtual phone numbers
      if (!fromUser.virtualPhoneNumber) {
        console.log(`User ${fromUser.username} doesn't have a virtual number, assigning one...`);
        const fromVirtualResult = await this.assignVirtualNumber(fromUserId);
        if (!fromVirtualResult.success) {
          throw new Error(`Failed to assign virtual number to sender: ${fromVirtualResult.error}`);
        }
        fromUser.virtualPhoneNumber = fromVirtualResult.virtualNumber;
      }

      if (!toUser.virtualPhoneNumber) {
        console.log(`User ${toUser.username} doesn't have a virtual number, assigning one...`);
        const toVirtualResult = await this.assignVirtualNumber(toUserId);
        if (!toVirtualResult.success) {
          throw new Error(`Failed to assign virtual number to recipient: ${toVirtualResult.error}`);
        }
        toUser.virtualPhoneNumber = toVirtualResult.virtualNumber;
      }

      // Send SMS using traditional SMS API with virtual number as "from"
      const result = await twilioService.sendDirectSMSWithFrom(
        toUser.virtualPhoneNumber,
        fromUser.virtualPhoneNumber,
        `[${fromUser.firstName} ${fromUser.lastName}]: ${message}`
      );

      return {
        success: result.success,
        messageId: result.messageId,
        from: fromUser.virtualPhoneNumber,
        to: toUser.virtualPhoneNumber,
        message: message
      };
    } catch (error) {
      console.error('Error sending internal SMS:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Send SMS from internal user to external phone number
  async sendExternalSMS(fromUserId, toPhoneNumber, message) {
    try {
      const fromUser = await User.findByPk(fromUserId);
      if (!fromUser) {
        throw new Error('User not found');
      }

      // Ensure sender has a virtual phone number
      if (!fromUser.virtualPhoneNumber) {
        console.log(`User ${fromUser.username} doesn't have a virtual number, assigning one...`);
        const virtualResult = await this.assignVirtualNumber(fromUserId);
        if (!virtualResult.success) {
          throw new Error(`Failed to assign virtual number to sender: ${virtualResult.error}`);
        }
        fromUser.virtualPhoneNumber = virtualResult.virtualNumber;
      }

      // Send SMS using traditional SMS API with virtual number as "from"
      const result = await twilioService.sendDirectSMSWithFrom(
        toPhoneNumber,
        fromUser.virtualPhoneNumber,
        `[${fromUser.firstName} ${fromUser.lastName}]: ${message}`
      );

      return {
        success: result.success,
        messageId: result.messageId,
        from: fromUser.virtualPhoneNumber,
        to: toPhoneNumber,
        message: message
      };
    } catch (error) {
      console.error('Error sending external SMS:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Handle incoming SMS to virtual numbers
  async handleIncomingSMS(fromPhoneNumber, toVirtualNumber, message) {
    try {
      // Find user by virtual phone number
      const user = await User.findOne({
        where: { virtualPhoneNumber: toVirtualNumber }
      });

      if (!user) {
        console.log(`No user found for virtual number: ${toVirtualNumber}`);
        return {
          success: false,
          error: 'User not found for virtual number'
        };
      }

      // Check if sender is another internal user
      const senderUser = await User.findOne({
        where: { virtualPhoneNumber: fromPhoneNumber }
      });

      let senderName = fromPhoneNumber;
      if (senderUser) {
        senderName = `${senderUser.firstName} ${senderUser.lastName}`;
      }

      // Store message in database (you'll need to implement this)
      // For now, just log it
      console.log(`SMS to ${user.username} (${toVirtualNumber}) from ${senderName}: ${message}`);

      return {
        success: true,
        recipientUserId: user.id,
        senderName: senderName,
        message: message
      };
    } catch (error) {
      console.error('Error handling incoming SMS:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get user by virtual phone number
  async getUserByVirtualNumber(virtualNumber) {
    return await User.findOne({
      where: { virtualPhoneNumber: virtualNumber }
    });
  }

  // Get all users with virtual numbers
  async getUsersWithVirtualNumbers() {
    return await User.findAll({
      where: { virtualPhoneNumber: { [require('sequelize').Op.ne]: null } },
      attributes: ['id', 'username', 'firstName', 'lastName', 'virtualPhoneNumber']
    });
  }

  // Remove virtual number from user
  async removeVirtualNumber(userId) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (user.virtualPhoneNumber) {
        this.numberPool.delete(user.virtualPhoneNumber);
        await user.update({ virtualPhoneNumber: null });
        
        console.log(`Removed virtual number ${user.virtualPhoneNumber} from user ${user.username}`);
      }

      return {
        success: true,
        message: 'Virtual number removed successfully'
      };
    } catch (error) {
      console.error('Error removing virtual number:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new VirtualPhoneService(); 