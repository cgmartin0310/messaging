const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const sequelize = require('./config/database');
const { testConnection } = require('./config/database');
const { User, Contact, Message } = require('./models');
const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');
const userRoutes = require('./routes/users');
const contactRoutes = require('./routes/contacts');
const conversationRoutes = require('./routes/conversations');
const webhookRoutes = require('./routes/webhooks');
const twilioNumberRoutes = require('./routes/twilioNumbers');
const groupRoutes = require('./routes/groups');
const consentRoutes = require('./routes/consents');

const app = express();

// Trust proxy for rate limiting in production
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'https://localhost:3000',
  'http://localhost:3001',
  'https://localhost:3001',
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  // Add Render-specific URLs
  'https://your-app-name.onrender.com',
  'https://your-frontend-app.onrender.com'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In production, be more permissive for Render
    if (process.env.NODE_ENV === 'production') {
      // Allow any origin from Render domains or any origin in production
      if (origin.includes('onrender.com') || origin.includes('render.com') || origin.includes('localhost')) {
        return callback(null, true);
      }
      // For production, allow all origins temporarily for debugging
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database connection
const connectDB = async () => {
  try {
    console.log('Attempting to connect to PostgreSQL...');
    console.log('Database URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    console.log('Environment:', process.env.NODE_ENV || 'development');
    
    // Use the test connection function
    const connected = await testConnection();
    
    if (connected) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Syncing database models (development only)...');
        await sequelize.sync({ alter: true });
        console.log('Database models synchronized');
      } else {
        console.log('Skipping schema sync in production');
      }
      return true;
    } else {
      console.log('Database connection failed after all attempts');
      return false;
    }
  } catch (error) {
    console.error('Database connection error:', error.message);
    console.error('Error code:', error.code);
    console.error('Error details:', error.original?.message || error.message);
    
    // Provide specific guidance based on error type
    if (error.code === 'ECONNREFUSED') {
      console.log('Connection refused: Check if the database is running and accessible.');
    } else if (error.code === 'ENOTFOUND') {
      console.log('Host not found: Check your DATABASE_URL configuration.');
    } else if (error.code === '3D000') {
      console.log('Database does not exist: Check if the database name in DATABASE_URL is correct.');
    } else if (error.code === '28P01') {
      console.log('Authentication failed: Check username and password in DATABASE_URL.');
    }
    
    console.log('Server will start without database connection. Some features may not work.');
    console.log('To fix this, start PostgreSQL or check your Render PostgreSQL instance');
    return false;
  }
};

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/twilio-numbers', twilioNumberRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/consents', consentRoutes);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      postgresql: 'connected'
    });
  } catch (error) {
          res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        postgresql: 'disconnected'
      });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: 'The requested route does not exist'
  });
});

const PORT = process.env.PORT || 5001;

// Start server
const startServer = async () => {
  try {
    const dbConnected = await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
      if (!dbConnected) {
        console.log('⚠️  WARNING: Server is running without database connection');
        console.log('   Some features like user authentication and message storage will not work');
        console.log('   To fix this, start PostgreSQL or check your Render PostgreSQL instance');
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer(); 