const express = require('express');
const twilioService = require('../services/twilioService');
const virtualPhoneService = require('../services/virtualPhoneService');
const { User } = require('../models');

const router = express.Router();

// Handle incoming SMS webhook
router.post('/twilio/incoming', async (req, res) => {
  try {
    const { From, To, Body, MessageSid } = req.body;
    
    console.log(`Incoming SMS from ${From} to ${To}: ${Body}`);
    
    // Verify webhook signature
    if (!twilioService.verifyWebhookSignature(req)) {
      console.error('Invalid webhook signature');
      return res.status(403).send('Forbidden');
    }
    
    // Check if this is a message to a virtual phone number
    const recipientUser = await virtualPhoneService.getUserByVirtualNumber(To);
    
    if (recipientUser) {
      // This is a message to an internal user's virtual number
      console.log(`Processing SMS to internal user ${recipientUser.username} (${To})`);
      
      // Find the conversation that includes this virtual number
      const { Conversation, ConversationParticipant } = require('../models');
      
      const conversation = await Conversation.findOne({
        include: [
          {
            model: ConversationParticipant,
            as: 'participants',
            where: { 
              phoneNumber: To,
              isActive: true
            }
          }
        ],
        where: { 
          isActive: true
        }
      });
      
      if (conversation) {
        console.log(`Found conversation: ${conversation.id} (${conversation.name})`);
        
        // Check if sender is another internal user
        const senderUser = await User.findOne({
          where: { virtualPhoneNumber: From }
        });
        
        let senderId = null;
        let senderName = From;
        
        if (senderUser) {
          senderId = senderUser.id;
          senderName = `${senderUser.firstName} ${senderUser.lastName}`;
          console.log(`Sender is internal user: ${senderName}`);
        } else {
          console.log(`Sender is external: ${From}`);
        }
        
        // Save message to database
        const { Message } = require('../models');
        const message = await Message.create({
          content: Body,
          messageType: 'text',
          senderId: senderId,
          conversationId: conversation.id,
          twilioMessageId: MessageSid,
          twilioStatus: 'received'
        });
        
        // Update conversation last message time
        await conversation.update({ lastMessageAt: new Date() });
        
        console.log(`Message saved to conversation: ${message.id}`);
        
        // Send SMS to other participants in the conversation
        const participants = await ConversationParticipant.findAll({
          where: { 
            ConversationId: conversation.id,
            isActive: true,
            phoneNumber: { [require('sequelize').Op.ne]: To } // Exclude recipient
          }
        });
        
        console.log(`Sending to ${participants.length} other participants`);
        
        for (const participant of participants) {
          if (participant.participantType === 'virtual') {
            // Send to internal user
            const targetUser = await User.findByPk(participant.identity);
            if (targetUser && targetUser.virtualPhoneNumber) {
              await virtualPhoneService.sendInternalSMS(
                recipientUser.id,
                targetUser.id,
                `[${senderName}]: ${Body}`
              );
            }
          } else if (participant.participantType === 'sms') {
            // Send to external SMS participant
            await virtualPhoneService.sendExternalSMS(
              recipientUser.id,
              participant.phoneNumber,
              `[${senderName}]: ${Body}`
            );
          }
        }
        
      } else {
        console.log(`No active conversation found for virtual number: ${To}`);
      }
      
    } else {
      // This is a regular SMS (not to a virtual number)
      console.log('Regular SMS received (not to virtual number):', { From, To, Body });
      
      // Find conversation by external phone number
      const { Conversation, ConversationParticipant } = require('../models');
      
      const conversation = await Conversation.findOne({
        include: [
          {
            model: ConversationParticipant,
            as: 'participants',
            where: { 
              phoneNumber: To,
              participantType: 'sms',
              isActive: true
            }
          }
        ],
        where: { 
          conversationType: 'sms',
          isActive: true
        }
      });
      
      if (conversation) {
        console.log(`Found SMS conversation: ${conversation.id} (${conversation.name})`);
        
        // Save message to database
        const { Message } = require('../models');
        const message = await Message.create({
          content: Body,
          messageType: 'text',
          senderId: null, // External sender
          conversationId: conversation.id,
          twilioMessageId: MessageSid,
          twilioStatus: 'received'
        });
        
        // Update conversation last message time
        await conversation.update({ lastMessageAt: new Date() });
        
        console.log(`Message saved to SMS conversation: ${message.id}`);
        
        // Send to other participants in the conversation
        const participants = await ConversationParticipant.findAll({
          where: { 
            ConversationId: conversation.id,
            isActive: true,
            phoneNumber: { [require('sequelize').Op.ne]: To } // Exclude recipient
          }
        });
        
        console.log(`Sending to ${participants.length} other participants`);
        
        for (const participant of participants) {
          if (participant.participantType === 'virtual') {
            // Send to internal user
            const targetUser = await User.findByPk(participant.identity);
            if (targetUser && targetUser.virtualPhoneNumber) {
              await virtualPhoneService.sendExternalSMS(
                targetUser.id,
                From,
                `[${From}]: ${Body}`
              );
            }
          }
        }
        
      } else {
        console.log(`No SMS conversation found for number: ${To}`);
      }
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error handling incoming SMS:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Handle status callback webhook
router.post('/twilio/status', async (req, res) => {
  try {
    const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = req.body;
    
    console.log(`Message ${MessageSid} status: ${MessageStatus}`);
    if (ErrorCode) {
      console.error(`Message ${MessageSid} error: ${ErrorCode} - ${ErrorMessage}`);
    }
    
    // Verify webhook signature
    if (!twilioService.verifyWebhookSignature(req)) {
      console.error('Invalid webhook signature');
      return res.status(403).send('Forbidden');
    }
    
    // Update message status in database if needed
    // You can implement your logic here to update message status
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error handling status callback:', error);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router; 