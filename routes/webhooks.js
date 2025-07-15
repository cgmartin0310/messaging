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
    
    // Find conversation that includes the From phone number
    const { Conversation, ConversationParticipant, Message } = require('../models');
    const { Op } = require('sequelize');
    
    // Look for a conversation where the From number is a participant
    const conversation = await Conversation.findOne({
      include: [
        {
          model: ConversationParticipant,
          as: 'participants',
          where: { 
            phoneNumber: From,
            participantType: 'sms',
            isActive: true
          },
          required: true
        }
      ],
      where: { 
        isActive: true
      }
    });
    
    if (conversation) {
      console.log(`Found conversation: ${conversation.id} (${conversation.name})`);
      
      // Save message to database with no senderId (external sender)
      const message = await Message.create({
        content: Body,
        messageType: 'text',
        senderId: null, // External sender
        conversationId: conversation.id,
        twilioMessageId: MessageSid,
        twilioStatus: 'received',
        senderPhone: From // Store the phone number
      });
      
      // Update conversation last message time
      await conversation.update({ lastMessageAt: new Date() });
      
      console.log(`Message saved to conversation: ${message.id}`);
      
      // Notify web app users in the conversation
      // This would be where you'd emit a Socket.IO event if implemented
      
    } else {
      console.log(`No conversation found for phone number: ${From}`);
      
      // Optionally create a new conversation for this number
      // For now, just log it
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