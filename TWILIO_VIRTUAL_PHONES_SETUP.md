# Virtual Phone Number System Setup Guide

## Why Virtual Phone Numbers? 🎯

**Instead of complex Conversations API, assign virtual phone numbers to internal users:**

### **Benefits:**
- ✅ **SMS users CAN reply back to web users**
- ✅ **Unified messaging experience** - everyone uses SMS
- ✅ **Simpler architecture** - traditional SMS API only
- ✅ **Lower costs** - no Conversations API fees
- ✅ **Easier setup** - just traditional SMS API
- ✅ **Group conversations** with mixed participants
- ✅ **Real-time web updates** via webhooks

### **How It Works:**
1. **User A (web)** sends message to **User B (web)**
2. **System** sends SMS from User A's virtual number to User B's virtual number
3. **User B** receives SMS on their phone
4. **User B** replies via SMS
5. **System** receives SMS and shows it in User A's web app

## Setup Steps

### 1. Environment Variables

Update your `.env` file:

```bash
# Twilio Configuration (Traditional SMS API)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-auth-token-here
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_MESSAGING_SERVICE_SID=your-messaging-service-sid

# Server Configuration
PORT=5001
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-here

# Database
DATABASE_URL=your-postgresql-connection-string

# Webhook URL (for production)
BASE_URL=https://your-domain.com
```

### 2. Database Migration

The system automatically creates virtual phone numbers for users. No additional setup needed.

### 3. Test the System

```bash
# Test virtual phone number assignment
npm run test-virtual-phones

# Test conversation participant management
npm run test-conversation-participants

# Test direct SMS sending
npm run test-sms-direct
```

## API Endpoints

### User Management
```bash
# Assign virtual number to current user
POST /api/users/virtual-number

# Remove virtual number from current user
DELETE /api/users/virtual-number

# Get all users with virtual numbers
GET /api/users/virtual-numbers

# Send SMS to internal user
POST /api/users/sms/internal/:userId
{ "message": "Hello!" }

# Send SMS to external number
POST /api/users/sms/external
{ "phoneNumber": "+1234567890", "message": "Hello!" }
```

### Conversation Management
```bash
# Create direct conversation
POST /api/conversations/direct
{ "recipientId": "user-id" }

# Create SMS conversation
POST /api/conversations/sms
{ "recipientPhoneNumber": "+1234567890", "recipientName": "John Doe" }

# Create group conversation
POST /api/conversations/group
{ "name": "Team Chat", "description": "Team discussion", "participants": ["user1", "user2"] }

# Add participant to conversation
POST /api/conversations/:id/participants
{ "participantId": "user-id", "participantType": "virtual", "displayName": "John Doe" }

# Remove participant from conversation
DELETE /api/conversations/:id/participants/:participantId

# Get conversation participants
GET /api/conversations/:id/participants

# Send message to conversation
POST /api/conversations/:id/messages
{ "content": "Hello everyone!", "messageType": "text" }
```

## Message Flow Examples

### Example 1: Internal User to Internal User
```
1. John (web) sends message to Jane (web)
2. System sends SMS: +1XXX1234567 → +1XXX7654321
3. Jane receives SMS on her phone
4. Jane replies via SMS: +1XXX7654321 → +1XXX1234567
5. System receives webhook and shows reply in John's web app
```

### Example 2: Internal User to External SMS
```
1. John (web) sends message to external contact
2. System sends SMS: +1XXX1234567 → +18777804236
3. External contact receives SMS
4. External contact replies: +18777804236 → +1XXX1234567
5. System receives webhook and shows reply in John's web app
```

### Example 3: Group Conversation
```
1. John sends message to group (John, Jane, External)
2. System sends SMS to Jane and External
3. Jane replies via SMS
4. System sends Jane's reply to John and External
5. External replies via SMS
6. System sends External's reply to John and Jane
```

## Virtual Phone Number Generation

Virtual numbers are generated based on your Twilio phone number:
- **Base**: Your Twilio phone number (e.g., +1XXX1234567)
- **Virtual**: +1XXX1234568, +1XXX1234569, etc.
- **Unique**: Each user gets a unique virtual number
- **Persistent**: Virtual numbers are saved in database

## Webhook Configuration

### Production Setup:
1. **Webhook URL**: `https://your-domain.com/api/webhooks/twilio/incoming`
2. **Status Callback**: `https://your-domain.com/api/webhooks/twilio/status`

### Local Development:
1. Use ngrok: `ngrok http 5001`
2. Set webhook URL to your ngrok URL
3. Update BASE_URL in .env

## Cost Comparison

### Virtual Phone Numbers:
- **SMS**: ~$0.0075 per message
- **Total**: ~$0.0075 per message (bidirectional)

### Conversations API:
- **SMS**: ~$0.0075 per message
- **Conversations**: ~$0.001 per participant per day
- **Total**: ~$0.01 per message (bidirectional)

**Savings**: Virtual phone numbers are **25% cheaper** than Conversations API!

## Troubleshooting

### Common Issues:

1. **"Virtual number not assigned"**
   - Solution: Call `POST /api/users/virtual-number`
   - Check database connection

2. **"SMS not sending"**
   - Solution: Verify Twilio credentials
   - Check phone number format (E.164)

3. **"Webhook not receiving"**
   - Solution: Verify webhook URL is accessible
   - Check ngrok for local development

4. **"Messages not syncing"**
   - Solution: Check webhook processing
   - Verify database connections

### Testing Commands:

```bash
# Test virtual phone system
npm run test-virtual-phones

# Test conversation participants
npm run test-conversation-participants

# Test direct SMS
npm run test-sms-direct

# Check webhook processing
curl -X POST https://your-domain.com/api/webhooks/twilio/incoming \
  -H "Content-Type: application/json" \
  -d '{"From":"+1234567890","To":"+1987654321","Body":"Test message"}'
```

## Next Steps

1. **Update your .env file** with Twilio credentials
2. **Test virtual phone assignment** with `npm run test-virtual-phones`
3. **Test conversation management** with `npm run test-conversation-participants`
4. **Deploy with webhook URL** for production
5. **Add Socket.IO integration** for real-time web updates

## Migration from Conversations API

If you were using Conversations API:

1. **Remove Conversations Service SID** from .env
2. **Update webhook handlers** to use virtual phone routing
3. **Test with virtual phone system**
4. **Deploy and verify** all functionality works

## Support

- [Twilio SMS API Documentation](https://www.twilio.com/docs/sms)
- [Twilio Webhook Events](https://www.twilio.com/docs/sms/api/message-resource#message-status-values)
- [E.164 Phone Number Format](https://en.wikipedia.org/wiki/E.164) 