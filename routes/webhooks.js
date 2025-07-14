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
      const result = await virtualPhoneService.handleIncomingSMS(From, To, Body);
      
      if (result.success) {
        console.log(`SMS delivered to internal user ${recipientUser.username}`);
        
        // Here you could emit a Socket.IO event to notify the web user
        // const io = req.app.get('io');
        // if (io) {
        //   io.to(`user-${recipientUser.id}`).emit('new-sms', {
        //     from: From,
        //     message: Body,
        //     timestamp: new Date()
        //   });
        // }
      }
    } else {
      // This is a regular SMS (not to a virtual number)
      console.log('Regular SMS received (not to virtual number):', { From, To, Body });
      
      // Here you would typically:
      // 1. Find the user by phone number
      // 2. Find the conversation they're messaging
      // 3. Save the message to database
      // 4. Send to other conversation participants via SMS
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