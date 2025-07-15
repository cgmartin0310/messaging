const twilio = require('twilio');

class TwilioService {
  constructor() {
    // Initialize Twilio client
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      this.phoneNumber = process.env.TWILIO_PHONE_NUMBER;
      console.log('Twilio client initialized successfully');
      console.log('Phone Number:', this.phoneNumber || 'Not set');
    } else {
      this.client = null;
      this.phoneNumber = null;
      console.log('Twilio not configured - using mock mode');
    }
  }

  /**
   * Send SMS message
   * @param {string} to - Recipient phone number
   * @param {string} message - Message body
   * @param {Object} [options={}] - Optional parameters
   * @param {string} [options.from] - Sender phone number (overrides messagingServiceSid)
   * @param {Object} [options.metadata] - Additional Twilio metadata
   * @returns {Promise<Object>} Send result
   */
  async sendSMS(to, message, options = {}) {
    const { from, metadata = {} } = options;

    if (!this.client) {
      console.log(`Mock SMS sent to ${to}: ${message}`);
      return {
        success: true,
        messageId: 'mock-message-id',
        status: 'sent',
        to,
        from: from || 'mock-number',
        body: message,
        errorCode: null,
        errorMessage: null
      };
    }

    try {
      const messageData = {
        body: message,
        to,
        statusCallback: `${process.env.BASE_URL || 'http://localhost:5000'}/api/webhooks/twilio/status`,
        ...metadata
      };

      if (from) {
        messageData.from = from;
      } else if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
        messageData.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
      } else {
        messageData.from = this.phoneNumber;
      }

      const result = await this.client.messages.create(messageData);
      
      return {
        success: true,
        messageId: result.sid,
        status: result.status,
        to: result.to,
        from: result.from || result.messagingServiceSid,
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

  // Update sendBulkSMS to use sendSMS
  async sendBulkSMS(recipients, message, options = {}) {
    const results = await Promise.all(
      recipients.map(recipient => this.sendSMS(recipient, message, options))
    );
    return results.map((result, index) => ({
      recipient: recipients[index],
      ...result
    }));
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
    if (!this.client) {
      return { success: true, status: 'delivered' };
    }

    try {
      const message = await this.client.messages(messageId).fetch();
      return {
        success: true,
        status: message.status,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage
      };
    } catch (error) {
      console.error('Twilio get message status error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Handle incoming SMS webhook
  async handleIncomingSMS(req, res) {
    try {
      const { From, To, Body, MessageSid } = req.body;
      
      console.log(`Incoming SMS from ${From} to ${To}: ${Body}`);
      
      // Verify webhook signature
      if (!this.verifyWebhookSignature(req)) {
        console.error('Invalid webhook signature');
        return res.status(403).send('Forbidden');
      }
      
      // Process the incoming SMS
      // You can implement your logic here to handle incoming messages
      
      res.status(200).send('OK');
    } catch (error) {
      console.error('Error handling incoming SMS:', error);
      res.status(500).send('Internal Server Error');
    }
  }

  // Handle status callback webhook
  async handleStatusCallback(req, res) {
    try {
      const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = req.body;
      
      console.log(`Message ${MessageSid} status: ${MessageStatus}`);
      if (ErrorCode) {
        console.error(`Message ${MessageSid} error: ${ErrorCode} - ${ErrorMessage}`);
      }
      
      // Verify webhook signature
      if (!this.verifyWebhookSignature(req)) {
        console.error('Invalid webhook signature');
        return res.status(403).send('Forbidden');
      }
      
      // Update message status in database if needed
      // You can implement your logic here
      
      res.status(200).send('OK');
    } catch (error) {
      console.error('Error handling status callback:', error);
      res.status(500).send('Internal Server Error');
    }
  }

  // Verify webhook signature
  verifyWebhookSignature(req) {
    if (!process.env.TWILIO_AUTH_TOKEN) {
      console.warn('TWILIO_AUTH_TOKEN not set, skipping signature verification');
      return true;
    }

    const twilioSignature = req.headers['x-twilio-signature'];
    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    
    return twilio.validateRequest(
      process.env.TWILIO_AUTH_TOKEN,
      twilioSignature,
      url,
      req.body
    );
  }

  // Generate encryption key for message encryption
  generateEncryptionKey() {
    return require('crypto').randomBytes(32).toString('hex');
  }

  // Encrypt message content
  encryptMessage(content, key) {
    const crypto = require('crypto');
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, Buffer.from(key, 'hex'));
    let encrypted = cipher.update(content, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  // Decrypt message content
  decryptMessage(encryptedData, key) {
    const crypto = require('crypto');
    const algorithm = 'aes-256-gcm';
    
    const decipher = crypto.createDecipher(algorithm, Buffer.from(key, 'hex'));
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

module.exports = new TwilioService(); 