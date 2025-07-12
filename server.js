const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const sequelize = require('./config/database');
const { User, Group, Message } = require('./models');
const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');
const userRoutes = require('./routes/users');
const groupRoutes = require('./routes/groups');
const conversationRoutes = require('./routes/conversations');

const app = express();

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
    
    await sequelize.authenticate();
    console.log('PostgreSQL connected successfully');
    
    // Sync all models with database
    console.log('Syncing database models...');
    await sequelize.sync({ alter: true });
    console.log('Database models synchronized');
    
    return true;
  } catch (error) {
    console.error('Database connection error:', error.message);
    console.error('Error code:', error.code);
    console.error('Error details:', error.original?.message || error.message);
    
    // Provide specific guidance based on error type
    if (error.code === 'DEPTH_ZERO_SELF_SIGNED_CERT' || error.code === 'SELF_SIGNED_CERT_IN_CHAIN') {
      console.log('SSL Certificate Issue: This is common on Render. The connection should still work.');
      console.log('If the app is working, you can ignore this warning.');
      // Try to continue anyway - sometimes the connection works despite SSL warnings
      try {
        await sequelize.sync({ alter: true });
        console.log('Database models synchronized despite SSL warning');
        return true;
      } catch (syncError) {
        console.log('Could not sync database models:', syncError.message);
        return false;
      }
    } else if (error.code === 'ECONNREFUSED') {
      console.log('Connection refused: Check if the database is running and accessible.');
    } else if (error.code === 'ENOTFOUND') {
      console.log('Host not found: Check your DATABASE_URL configuration.');
    }
    
    console.log('Server will start without database connection. Some features may not work.');
    console.log('To fix this, please check your database connection string.');
    return false;
  }
};

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/conversations', conversationRoutes);

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
        console.log('   To fix this, start MongoDB or use a cloud MongoDB instance');
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer(); 