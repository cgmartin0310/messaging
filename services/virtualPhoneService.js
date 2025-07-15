const twilioService = require('./twilioService');
const twilioNumberService = require('./twilioNumberService');
const { User } = require('../models');

class VirtualPhoneService {
  constructor() {
    // Load existing numbers asynchronously
    this.loadExistingNumbers().catch(error => {
      console.error('Error loading existing virtual numbers:', error);
    });
  }

  // Load existing virtual numbers from database
  async loadExistingNumbers() {
    try {
      await twilioNumberService.reloadNumbers();
      console.log('Twilio numbers loaded successfully');
    } catch (error) {
      console.error('Error loading existing virtual numbers:', error);
    }
  }

  // Assign a Twilio number to a user
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

      // Get available Twilio numbers
      const availableNumbers = twilioNumberService.getAvailableNumbers();
      
      if (availableNumbers.length === 0) {
        throw new Error('No available Twilio numbers. Please add more numbers to the pool.');
      }

      // Assign the first available number
      const phoneNumber = availableNumbers[0];
      const result = await twilioNumberService.assignNumberToUser(userId, phoneNumber);
      
      if (result.success) {
        console.log(`Assigned Twilio number ${phoneNumber} to user ${user.username}`);
        return {
          success: true,
          virtualNumber: phoneNumber,
          message: 'Twilio number assigned successfully'
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error assigning virtual number:', error);
      return {
        success: false,
        error: error.message
      };
    }
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

      // Send SMS using the sender's virtual number as From
      const result = await twilioService.sendDirectSMSWithFrom(
        toUser.virtualPhoneNumber,
        message,
        { from: fromUser.virtualPhoneNumber }
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

      // Send SMS using the sender's virtual number as From
      const result = await twilioService.sendDirectSMSWithFrom(
        toPhoneNumber,
        message,
        { from: fromUser.virtualPhoneNumber }
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