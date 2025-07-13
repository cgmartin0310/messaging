# Secure Messaging App with Virtual Phone Numbers

A full-stack secure messaging application built with Node.js, React, and Twilio SMS API. This app uses **virtual phone numbers** to enable bidirectional messaging between web users and SMS users.

## Features

### 🔐 Security
- JWT-based authentication
- Password encryption with bcrypt
- Message encryption
- Rate limiting
- Input validation and sanitization

### 👥 User Management
- User registration and login
- Profile management
- **Virtual phone number assignment**
- Contact management
- User search functionality

### 💬 Unified Messaging
- **Virtual phone numbers** for internal users
- **Bidirectional SMS messaging** between web and SMS users
- **Group conversations** with mixed participants
- **Real-time web updates** via webhooks
- Message encryption
- Read receipts
- Message editing and deletion

### 📱 SMS Integration
- **Traditional SMS API** (simpler, cheaper)
- **Virtual phone number system** for internal users
- **Bidirectional messaging** - SMS users can reply back
- **Group SMS** to multiple participants
- Message status tracking
- Webhook handling

## How It Works

### Virtual Phone Number System:
1. **Internal users** get assigned virtual phone numbers
2. **All messaging** goes through SMS (even between web users)
3. **Unified experience** - everyone uses the same channel
4. **Simpler architecture** - no complex Conversations API needed

### Message Flow:
```
Web User A → System → SMS to User B's virtual number
User B receives SMS → Replies via SMS → System → Web User A sees reply
```

## Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **PostgreSQL** - Database
- **Sequelize** - ORM
- **Twilio SMS API** - SMS service
- **Socket.IO** - Real-time communication
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Helmet** - Security middleware

### Frontend
- **React** - UI framework
- **React Router** - Navigation
- **Material-UI** - Styling
- **Socket.IO Client** - Real-time communication
- **Axios** - HTTP client
- **React Hook Form** - Form handling
- **Lucide React** - Icons

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (local or cloud)
- Twilio account with:
  - Account SID
  - Auth Token
  - Phone number
  - Messaging Service SID (optional)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd secure-messaging-app
   ```

2. **Install backend dependencies**
   ```bash
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd client
   npm install
   cd ..
   ```

4. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   # Twilio Configuration (Traditional SMS API)
   TWILIO_ACCOUNT_SID=your-twilio-account-sid
   TWILIO_AUTH_TOKEN=your-twilio-auth-token
   TWILIO_PHONE_NUMBER=+1234567890
   TWILIO_MESSAGING_SERVICE_SID=your-messaging-service-sid

   # Server Configuration
   PORT=5001
   NODE_ENV=development

   # JWT Secret
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

   # Database
   DATABASE_URL=postgresql://username:password@host:port/database

   # Webhook URL (for production)
   BASE_URL=https://your-domain.com
   ```

5. **Start PostgreSQL**
   ```bash
   # If using local PostgreSQL
   pg_ctl start
   ```

6. **Run the application**

   **Development mode (both backend and frontend):**
   ```bash
   # Terminal 1 - Backend
   npm run dev

   # Terminal 2 - Frontend
   cd client
   npm start
   ```

   **Production mode:**
   ```bash
   # Install all dependencies
   npm run install-all

   # Build frontend
   cd client && npm run build && cd ..

   # Start production server
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `POST /api/auth/refresh` - Refresh token

### User Management
- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update user profile
- `POST /api/users/virtual-number` - Assign virtual phone number
- `DELETE /api/users/virtual-number` - Remove virtual phone number
- `GET /api/users/virtual-numbers` - Get all users with virtual numbers
- `POST /api/users/sms/internal/:userId` - Send SMS to internal user
- `POST /api/users/sms/external` - Send SMS to external number

### Conversations
- `POST /api/conversations/direct` - Create direct conversation
- `POST /api/conversations/sms` - Create SMS conversation
- `POST /api/conversations/group` - Create group conversation
- `GET /api/conversations/:id` - Get conversation details
- `GET /api/conversations/:id/participants` - Get conversation participants
- `POST /api/conversations/:id/participants` - Add participant
- `DELETE /api/conversations/:id/participants/:participantId` - Remove participant
- `POST /api/conversations/:id/messages` - Send message to conversation

### Messages
- `POST /api/messages/:conversationId` - Send message
- `GET /api/messages/:conversationId` - Get conversation messages
- `PUT /api/messages/:messageId` - Edit message
- `DELETE /api/messages/:messageId` - Delete message

### Webhooks
- `POST /api/webhooks/twilio/incoming` - Handle incoming SMS
- `POST /api/webhooks/twilio/status` - Handle status callbacks

## Twilio Setup

1. **Create a Twilio account** at [twilio.com](https://www.twilio.com)

2. **Get your credentials**:
   - Account SID
   - Auth Token
   - Phone number
   - Messaging Service SID (optional but recommended)

3. **Set up webhooks** (for production):
   - Incoming SMS: `https://your-domain.com/api/webhooks/twilio/incoming`
   - Status callback: `https://your-domain.com/api/webhooks/twilio/status`

## Testing

### Test Commands:
```bash
# Test virtual phone number system
npm run test-virtual-phones

# Test conversation participant management
npm run test-conversation-participants

# Test direct SMS sending
npm run test-sms-direct

# Test database connection
npm run test-db
```

## Cost Comparison

### Virtual Phone Numbers:
- **SMS**: ~$0.0075 per message
- **Total**: ~$0.0075 per message (bidirectional)

### Conversations API:
- **SMS**: ~$0.0075 per message
- **Conversations**: ~$0.001 per participant per day
- **Total**: ~$0.01 per message (bidirectional)

**Savings**: Virtual phone numbers are **25% cheaper** than Conversations API!

## Database Schema

### User
```javascript
{
  id: UUID,
  username: String,
  email: String,
  password: String (hashed),
  firstName: String,
  lastName: String,
  phoneNumber: String,
  virtualPhoneNumber: String, // Virtual number for SMS
  avatar: String,
  isActive: Boolean,
  lastSeen: Date,
  createdAt: Date
}
```

### Conversation
```javascript
{
  id: UUID,
  name: String,
  description: String,
  conversationType: ENUM('direct', 'group', 'sms'),
  isActive: Boolean,
  isPrivate: Boolean,
  maxParticipants: Number,
  lastMessageAt: Date,
  createdAt: Date
}
```

### ConversationParticipant
```javascript
{
  id: UUID,
  ConversationId: UUID,
  participantType: ENUM('virtual', 'sms'),
  identity: String, // User ID or phone number
  phoneNumber: String,
  displayName: String,
  role: ENUM('admin', 'member'),
  isActive: Boolean,
  joinedAt: Date,
  leftAt: Date
}
```

### Message
```javascript
{
  id: UUID,
  content: String,
  messageType: ENUM('text', 'image', 'file', 'audio', 'video'),
  senderId: UUID,
  conversationId: UUID,
  isEncrypted: Boolean,
  twilioMessageId: String,
  twilioStatus: ENUM('pending', 'sent', 'delivered', 'failed'),
  isEdited: Boolean,
  isDeleted: Boolean,
  createdAt: Date
}
```

## Deployment

### Render Deployment:
1. **Backend**: Web service with Node.js
2. **Frontend**: Static site
3. **Database**: PostgreSQL
4. **Environment Variables**: Set all required variables
5. **Webhooks**: Configure Twilio webhooks

See `DEPLOYMENT.md` for detailed instructions.

## Support

- [Twilio SMS API Documentation](https://www.twilio.com/docs/sms)
- [Virtual Phone Number Setup Guide](TWILIO_VIRTUAL_PHONES_SETUP.md)
- [Deployment Guide](DEPLOYMENT.md) 