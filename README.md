# Secure Messaging App with Twilio

A full-stack secure messaging application built with Node.js, React, and Twilio for SMS integration. This app allows users to create groups, send secure messages, and receive SMS notifications via Twilio.

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
- Contact management
- User search functionality

### 💬 Group Messaging
- Create and manage groups
- Add/remove group members
- Admin roles and permissions
- Public and private groups

### 📱 Messaging
- Real-time messaging with Socket.IO
- SMS notifications via Twilio
- Message encryption
- Read receipts
- Message editing and deletion
- File and media sharing support

### 📨 Twilio Integration
- SMS sending and receiving
- Phone number verification
- Message status tracking
- Webhook handling

## Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **Twilio** - SMS service
- **Socket.IO** - Real-time communication
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Helmet** - Security middleware

### Frontend
- **React** - UI framework
- **React Router** - Navigation
- **Tailwind CSS** - Styling
- **Socket.IO Client** - Real-time communication
- **Axios** - HTTP client
- **React Hook Form** - Form handling
- **Lucide React** - Icons

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud)
- Twilio account with:
  - Account SID
  - Auth Token
  - Phone number
  - Verify service (optional)

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
   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # MongoDB Connection
   MONGODB_URI=mongodb://localhost:27017/secure-messaging

   # JWT Secret
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

   # Twilio Configuration
   TWILIO_ACCOUNT_SID=your-twilio-account-sid
   TWILIO_AUTH_TOKEN=your-twilio-auth-token
   TWILIO_PHONE_NUMBER=+1234567890

   # Security
   BCRYPT_ROUNDS=12
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   ```

5. **Start MongoDB**
   ```bash
   # If using local MongoDB
   mongod
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
- `POST /api/auth/verify-phone` - Verify phone number
- `POST /api/auth/check-verification` - Check verification code
- `GET /api/auth/profile` - Get user profile
- `POST /api/auth/refresh` - Refresh token

### Users
- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update user profile
- `PUT /api/users/change-password` - Change password
- `GET /api/users/search` - Search users
- `GET /api/users/:userId` - Get user by ID
- `POST /api/users/contacts/:userId` - Add contact
- `DELETE /api/users/contacts/:userId` - Remove contact
- `GET /api/users/contacts` - Get user contacts
- `GET /api/users/groups` - Get user groups

### Groups
- `POST /api/groups` - Create group
- `GET /api/groups` - Get all groups
- `GET /api/groups/:groupId` - Get group by ID
- `PUT /api/groups/:groupId` - Update group
- `POST /api/groups/:groupId/join` - Join group
- `POST /api/groups/:groupId/leave` - Leave group
- `POST /api/groups/:groupId/members/:userId` - Add member
- `DELETE /api/groups/:groupId/members/:userId` - Remove member
- `POST /api/groups/:groupId/members/:userId/promote` - Promote to admin
- `DELETE /api/groups/:groupId` - Delete group

### Messages
- `POST /api/messages/:groupId` - Send message
- `GET /api/messages/:groupId` - Get group messages
- `GET /api/messages/message/:messageId` - Get message by ID
- `POST /api/messages/:messageId/read` - Mark as read
- `PUT /api/messages/:messageId` - Edit message
- `DELETE /api/messages/:messageId` - Delete message
- `GET /api/messages/unread/count` - Get unread count
- `GET /api/messages/:groupId/search` - Search messages

### Webhooks
- `POST /api/webhooks/twilio/incoming` - Handle incoming SMS
- `POST /api/webhooks/twilio/status` - Handle status callbacks

## Twilio Setup

1. **Create a Twilio account** at [twilio.com](https://www.twilio.com)

2. **Get your credentials**:
   - Account SID
   - Auth Token
   - Phone number

3. **Set up webhooks** (for production):
   - Incoming SMS: `https://your-domain.com/api/webhooks/twilio/incoming`
   - Status callback: `https://your-domain.com/api/webhooks/twilio/status`

4. **Optional: Set up Verify service** for phone verification

## Database Schema

### User
```javascript
{
  username: String,
  email: String,
  password: String (hashed),
  phoneNumber: String,
  firstName: String,
  lastName: String,
  avatar: String,
  isActive: Boolean,
  lastSeen: Date,
  groups: [ObjectId],
  contacts: [ObjectId]
}
```

### Group
```javascript
{
  name: String,
  description: String,
  avatar: String,
  creator: ObjectId,
  admins: [ObjectId],
  members: [{
    user: ObjectId,
    role: String,
    joinedAt: Date
  }],
  isPrivate: Boolean,
  isActive: Boolean,
  maxMembers: Number,
  settings: Object
}
```

### Message
```javascript
{
  sender: ObjectId,
  group: ObjectId,
  content: String,
  messageType: String,
  mediaUrl: String,
  isEncrypted: Boolean,
  encryptionKey: String,
  twilioMessageId: String,
  twilioStatus: String,
  readBy: [{
    user: ObjectId,
    readAt: Date
  }],
  replyTo: ObjectId,
  isEdited: Boolean,
  isDeleted: Boolean
}
```

## Security Features

- **Password Hashing**: bcrypt with configurable rounds
- **JWT Authentication**: Secure token-based auth
- **Rate Limiting**: Prevent abuse
- **Input Validation**: Comprehensive validation
- **CORS Protection**: Configured for security
- **Helmet**: Security headers
- **Message Encryption**: AES-256-GCM encryption

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, please open an issue in the GitHub repository or contact the development team.

## Roadmap

- [ ] Push notifications
- [ ] Voice messages
- [ ] Video calls
- [ ] End-to-end encryption
- [ ] Message reactions
- [ ] Group polls
- [ ] Message scheduling
- [ ] Advanced search
- [ ] Message translation
- [ ] Mobile app 