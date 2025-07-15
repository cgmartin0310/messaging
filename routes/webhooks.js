const express = require('express');
const twilioService = require('../services/twilioService');
const virtualPhoneService = require('../services/virtualPhoneService');
const { User } = require('../models');

const router = express.Router();

// Test webhook endpoint
router.get('/test', (req, res) => {
  console.log('Webhook test endpoint hit');
  res.json({ 
    status: 'ok', 
    message: 'Webhook endpoint is accessible',
    timestamp: new Date().toISOString()
  });
});

// Handle incoming SMS webhook
router.post('/twilio/incoming', async (req, res) => {
  try {
    const { From, To, Body, MessageSid } = req.body;
    
    console.log('=== INCOMING SMS WEBHOOK ===');
    console.log(`From: ${From}`);
    console.log(`To: ${To}`);
    console.log(`Body: ${Body}`);
    console.log(`MessageSid: ${MessageSid}`);
    console.log('Full request body:', JSON.stringify(req.body, null, 2));
    
    // Verify webhook signature
    if (!twilioService.verifyWebhookSignature(req)) {
      console.error('Invalid webhook signature - rejecting request');
      return res.status(403).send('Forbidden');
    }
    
    console.log('Webhook signature verified successfully');
    
    // Find conversation that includes the From phone number
    const { Conversation, ConversationParticipant, Message } = require('../models');
    const { Op } = require('sequelize');
    
    // Normalize phone numbers (remove + if present for consistent lookup)
    const normalizedFrom = From.replace(/^\+/, '');
    console.log(`Looking for conversation with participant phone number: ${From} (normalized: ${normalizedFrom})`);
    
    // Look for a conversation where the From number is a participant
    const conversation = await Conversation.findOne({
      include: [
        {
          model: ConversationParticipant,
          as: 'participants',
          where: { 
            [Op.or]: [
              { phoneNumber: From },
              { phoneNumber: normalizedFrom },
              { phoneNumber: `+${normalizedFrom}` }
            ],
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
      
      console.log(`Message saved successfully with ID: ${message.id}`);
      console.log('Message details:', {
        id: message.id,
        conversationId: message.conversationId,
        senderPhone: message.senderPhone,
        content: message.content
      });
      
      // TODO: Emit Socket.IO event here to notify web clients
      // io.to(`conversation:${conversation.id}`).emit('new_message', message.getMessageInfo());
      
    } else {
      console.log(`No conversation found for phone number: ${From}`);
      console.log('This might be a new conversation or the participant is not properly set up');
      
      // Let's check if there are any conversations at all
      const allConversations = await Conversation.findAll({
        include: [{
          model: ConversationParticipant,
          as: 'participants'
        }]
      });
      
      console.log(`Total conversations in database: ${allConversations.length}`);
      allConversations.forEach(conv => {
        console.log(`Conversation ${conv.id}: ${conv.name}`);
        conv.participants.forEach(p => {
          console.log(`  - Participant: ${p.displayName || p.phoneNumber} (${p.participantType})`);
        });
      });
    }
    
    console.log('=== WEBHOOK PROCESSING COMPLETE ===');
    res.status(200).send('OK');
  } catch (error) {
    console.error('=== WEBHOOK ERROR ===');
    console.error('Error handling incoming SMS:', error);
    console.error('Stack trace:', error.stack);
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