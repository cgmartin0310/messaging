const twilio = require('twilio');
const crypto = require('crypto');

class TwilioService {
  constructor() {
    // Only initialize Twilio client if credentials are provided and valid
    if (process.env.TWILIO_ACCOUNT_SID && 
        process.env.TWILIO_AUTH_TOKEN && 
        process.env.TWILIO_ACCOUNT_SID.startsWith('AC')) {
      try {
        this.client = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );
        this.conversationsClient = this.client.conversations;
        this.phoneNumber = process.env.TWILIO_PHONE_NUMBER;
        console.log('Twilio Conversations client initialized successfully');
      } catch (error) {
        console.log('Failed to initialize Twilio client:', error.message);
        this.client = null;
        this.conversationsClient = null;
        this.phoneNumber = null;
      }
    } else {
      console.log('Twilio credentials not provided or invalid - SMS features will be disabled');
      this.client = null;
      this.conversationsClient = null;
      this.phoneNumber = null;
    }
  }

  // Create or get a conversation
  async createOrGetConversation(uniqueName, friendlyName = null) {
    if (!this.conversationsClient) {
      console.log('Mock: Creating conversation:', uniqueName);
      return { success: true, conversationId: `mock-conversation-${uniqueName}` };
    }

    try {
      // Try to get existing conversation
      let conversation;
      try {
        conversation = await this.conversationsClient.conversations(uniqueName).fetch();
      } catch (error) {
        // Conversation doesn't exist, create it
        conversation = await this.conversationsClient.conversations.create({
          uniqueName: uniqueName,
          friendlyName: friendlyName || uniqueName
        });
      }

      return {
        success: true,
        conversationId: conversation.sid,
        conversation: conversation
      };
    } catch (error) {
      console.error('Twilio conversation creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Add participant to conversation
  async addParticipant(conversationId, identity, attributes = {}) {
    if (!this.conversationsClient) {
      console.log('Mock: Adding participant', identity, 'to conversation', conversationId);
      return { success: true, participantId: `mock-participant-${identity}` };
    }

    try {
      // Check if participant already exists
      try {
        const existingParticipant = await this.conversationsClient
          .conversations(conversationId)
          .participants(identity)
          .fetch();
        
        return {
          success: true,
          participantId: existingParticipant.sid,
          participant: existingParticipant
        };
      } catch (error) {
        // Participant doesn't exist, create it
        const participant = await this.conversationsClient
          .conversations(conversationId)
          .participants
          .create({
            identity: identity,
            attributes: JSON.stringify(attributes)
          });

        return {
          success: true,
          participantId: participant.sid,
          participant: participant
        };
      }
    } catch (error) {
      console.error('Twilio add participant error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Send message to conversation
  async sendMessage(conversationId, author, body, attributes = {}) {
    if (!this.conversationsClient) {
      console.log('Mock: Sending message to conversation', conversationId, 'from', author, ':', body);
      return { success: true, messageId: `mock-message-${Date.now()}` };
    }

    try {
      const message = await this.conversationsClient
        .conversations(conversationId)
        .messages
        .create({
          author: author,
          body: body,
          attributes: JSON.stringify(attributes)
        });

      return {
        success: true,
        messageId: message.sid,
        message: message
      };
    } catch (error) {
      console.error('Twilio send message error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get conversation messages
  async getMessages(conversationId, limit = 50) {
    if (!this.conversationsClient) {
      console.log('Mock: Getting messages from conversation', conversationId);
      return { success: true, messages: [] };
    }

    try {
      const messages = await this.conversationsClient
        .conversations(conversationId)
        .messages
        .list({ limit: limit });

      return {
        success: true,
        messages: messages
      };
    } catch (error) {
      console.error('Twilio get messages error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Send SMS message (fallback for external SMS)
  async sendSMS(to, message, metadata = {}) {
    // If Twilio is not configured, return a mock success response
    if (!this.client) {
      console.log(`Mock SMS sent to ${to}: ${message}`);
      return {
        success: true,
        messageId: 'mock-message-id',
        status: 'sent',
        to: to,
        from: 'mock-number',
        body: message,
        errorCode: null,
        errorMessage: null
      };
    }

    try {
      const messageData = {
        body: message,
        from: this.phoneNumber,
        to: to,
        statusCallback: `${process.env.BASE_URL || 'http://localhost:5000'}/api/webhooks/twilio/status`,
        ...metadata
      };

      const result = await this.client.messages.create(messageData);
      
      return {
        success: true,
        messageId: result.sid,
        status: result.status,
        to: result.to,
        from: result.from,
        body: result.body,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage
      };
    } catch (error) {
      console.error('Twilio SMS error:', error);
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  // Send bulk SMS to multiple recipients
  async sendBulkSMS(recipients, message, metadata = {}) {
    const results = [];
    
    for (const recipient of recipients) {
      const result = await this.sendSMS(recipient, message, metadata);
      results.push({
        recipient,
        ...result
      });
    }
    
    return results;
  }

  // Verify phone number
  async verifyPhoneNumber(phoneNumber) {
    try {
      const verification = await this.client.verify.v2
        .services(process.env.TWILIO_VERIFY_SERVICE_SID)
        .verifications.create({
          to: phoneNumber,
          channel: 'sms'
        });

      return {
        success: true,
        sid: verification.sid,
        status: verification.status
      };
    } catch (error) {
      console.error('Twilio verification error:', error);
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  // Check verification code
  async checkVerificationCode(phoneNumber, code) {
    try {
      const verificationCheck = await this.client.verify.v2
        .services(process.env.TWILIO_VERIFY_SERVICE_SID)
        .verificationChecks.create({
          to: phoneNumber,
          code: code
        });

      return {
        success: true,
        sid: verificationCheck.sid,
        status: verificationCheck.status,
        valid: verificationCheck.status === 'approved'
      };
    } catch (error) {
      console.error('Twilio verification check error:', error);
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  // Get message status
  async getMessageStatus(messageId) {
    try {
      const message = await this.client.messages(messageId).fetch();
      return {
        success: true,
        messageId: message.sid,
        status: message.status,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage
      };
    } catch (error) {
      console.error('Twilio get message status error:', error);
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  // Handle incoming SMS webhook
  async handleIncomingSMS(req, res) {
    try {
      const { From, To, Body, MessageSid } = req.body;
      
      // Verify the request is from Twilio
      if (!this.verifyWebhookSignature(req)) {
        return res.status(403).json({ error: 'Invalid signature' });
      }

      // Process the incoming message
      const messageData = {
        from: From,
        to: To,
        body: Body,
        messageId: MessageSid,
        timestamp: new Date()
      };

      // Here you would typically:
      // 1. Find the user by phone number
      // 2. Find the group they're messaging
      // 3. Save the message to database
      // 4. Send to other group members via SMS or push notification

      console.log('Incoming SMS:', messageData);
      
      res.status(200).send();
    } catch (error) {
      console.error('Incoming SMS webhook error:', error);
      res.status(500).json({ error: 'Webhook processing error' });
    }
  }

  // Handle status callback webhook
  async handleStatusCallback(req, res) {
    try {
      const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = req.body;
      
      // Verify the request is from Twilio
      if (!this.verifyWebhookSignature(req)) {
        return res.status(403).json({ error: 'Invalid signature' });
      }

      // Update message status in database
      const Message = require('../models/Message');
      await Message.findOneAndUpdate(
        { twilioMessageId: MessageSid },
        { 
          twilioStatus: MessageStatus,
          ...(ErrorCode && { 'metadata.errorCode': ErrorCode }),
          ...(ErrorMessage && { 'metadata.errorMessage': ErrorMessage })
        }
      );

      console.log(`Message ${MessageSid} status: ${MessageStatus}`);
      
      res.status(200).send();
    } catch (error) {
      console.error('Status callback webhook error:', error);
      res.status(500).json({ error: 'Status callback processing error' });
    }
  }

  // Verify webhook signature
  verifyWebhookSignature(req) {
    const signature = req.headers['x-twilio-signature'];
    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const params = req.body;

    return twilio.validateRequest(
      process.env.TWILIO_AUTH_TOKEN,
      signature,
      url,
      params
    );
  }

  // Generate encryption key for messages
  generateEncryptionKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Encrypt message content
  encryptMessage(content, key) {
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);
    
    let encrypted = cipher.update(content, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  // Decrypt message content
  decryptMessage(encryptedData, key) {
    const algorithm = 'aes-256-gcm';
    const decipher = crypto.createDecipher(algorithm, key);
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

module.exports = new TwilioService(); 