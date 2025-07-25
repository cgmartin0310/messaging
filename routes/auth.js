const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const twilioService = require('../services/twilioService');
const virtualPhoneService = require('../services/virtualPhoneService');
const sequelize = require('../config/database');
const { Op } = require('sequelize');

const router = express.Router();

// Check if database is connected
const isDatabaseConnected = async () => {
  try {
    await sequelize.authenticate();
    return true;
  } catch (error) {
    return false;
  }
};

// Validation middleware
const validateRegistration = [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('phoneNumber')
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid phone number'),
  body('firstName')
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  body('lastName')
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters')
];

const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Register new user
router.post('/register', validateRegistration, async (req, res) => {
  try {
    // Check if database is connected
    if (!(await isDatabaseConnected())) {
      return res.status(503).json({
        error: 'Database unavailable',
        message: 'Database is not connected. Please try again later or contact support.'
      });
    }

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { username, email, password, phoneNumber, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { email: email },
          { username: username },
          { phoneNumber: phoneNumber }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'User already exists',
        message: 'A user with this email, username, or phone number already exists'
      });
    }

    // Create new user
    const user = await User.create({
      username,
      email,
      password,
      phoneNumber,
      firstName,
      lastName
    });

    // Assign virtual phone number to new user
    try {
      const virtualResult = await virtualPhoneService.assignVirtualNumber(user.id);
      if (virtualResult.success) {
        console.log(`Assigned virtual number ${virtualResult.virtualNumber} to user ${user.username}`);
      } else {
        console.warn(`Failed to assign virtual number to user ${user.username}: ${virtualResult.error}`);
      }
    } catch (error) {
      console.error('Error assigning virtual number during registration:', error);
      // Don't fail registration if virtual number assignment fails
    }

    // Generate token
    const token = generateToken(user.id);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: user.getProfile()
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    // Check if it's a database connection error
    if (error.name === 'SequelizeConnectionError' || error.name === 'SequelizeHostNotFoundError') {
      return res.status(503).json({
        error: 'Database unavailable',
        message: 'Database is not connected. Please try again later or contact support.'
      });
    }
    
    res.status(500).json({
      error: 'Registration failed',
      message: 'An error occurred during registration'
    });
  }
});

// Login user
router.post('/login', validateLogin, async (req, res) => {
  try {
    // Check if database is connected
    if (!(await isDatabaseConnected())) {
      return res.status(503).json({
        error: 'Database unavailable',
        message: 'Database is not connected. Please try again later or contact support.'
      });
    }

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ where: { email: email } });
    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        error: 'Account deactivated',
        message: 'Your account has been deactivated'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Update last seen
    await user.updateLastSeen();

    // Generate token
    const token = generateToken(user.id);

    res.json({
      message: 'Login successful',
      token,
      user: user.getProfile()
    });
  } catch (error) {
    console.error('Login error:', error);
    
    // Check if it's a database connection error
    if (error.name === 'SequelizeConnectionError' || error.name === 'SequelizeHostNotFoundError') {
      return res.status(503).json({
        error: 'Database unavailable',
        message: 'Database is not connected. Please try again later or contact support.'
      });
    }
    
    res.status(500).json({
      error: 'Login failed',
      message: 'An error occurred during login'
    });
  }
});

// Verify phone number
router.post('/verify-phone', async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        error: 'Phone number required',
        message: 'Please provide a phone number'
      });
    }

    const result = await twilioService.verifyPhoneNumber(phoneNumber);
    
    if (result.success) {
      res.json({
        message: 'Verification code sent',
        sid: result.sid
      });
    } else {
      res.status(400).json({
        error: 'Verification failed',
        message: result.error
      });
    }
  } catch (error) {
    console.error('Phone verification error:', error);
    res.status(500).json({
      error: 'Verification failed',
      message: 'An error occurred during phone verification'
    });
  }
});

// Check verification code
router.post('/check-verification', async (req, res) => {
  try {
    const { phoneNumber, code } = req.body;

    if (!phoneNumber || !code) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Please provide both phone number and verification code'
      });
    }

    const result = await twilioService.checkVerificationCode(phoneNumber, code);
    
    if (result.success && result.valid) {
      res.json({
        message: 'Phone number verified successfully',
        verified: true
      });
    } else {
      res.status(400).json({
        error: 'Verification failed',
        message: 'Invalid verification code'
      });
    }
  } catch (error) {
    console.error('Verification check error:', error);
    res.status(500).json({
      error: 'Verification failed',
      message: 'An error occurred during verification'
    });
  }
});

// Get current user profile
router.get('/profile', async (req, res) => {
  try {
    // Check if database is connected
    if (!(await isDatabaseConnected())) {
      return res.status(503).json({
        error: 'Database unavailable',
        message: 'Database is not connected. Please try again later or contact support.'
      });
    }

    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        error: 'Token required',
        message: 'Please provide an authentication token'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'User not found'
      });
    }

    res.json({
      user: user.getProfile()
    });
  } catch (error) {
    console.error('Profile error:', error);
    
    // Check if it's a database connection error
    if (error.name === 'SequelizeConnectionError' || error.name === 'SequelizeHostNotFoundError') {
      return res.status(503).json({
        error: 'Database unavailable',
        message: 'Database is not connected. Please try again later or contact support.'
      });
    }
    
    res.status(500).json({
      error: 'Profile retrieval failed',
      message: 'An error occurred while retrieving profile'
    });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    // Check if database is connected
    if (!(await isDatabaseConnected())) {
      return res.status(503).json({
        error: 'Database unavailable',
        message: 'Database is not connected. Please try again later or contact support.'
      });
    }

    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        error: 'Token required',
        message: 'Please provide an authentication token'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'User not found'
      });
    }

    // Generate new token
    const newToken = generateToken(user.id);

    res.json({
      message: 'Token refreshed successfully',
      token: newToken,
      user: user.getProfile()
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    
    // Check if it's a database connection error
    if (error.name === 'SequelizeConnectionError' || error.name === 'SequelizeHostNotFoundError') {
      return res.status(503).json({
        error: 'Database unavailable',
        message: 'Database is not connected. Please try again later or contact support.'
      });
    }
    
    res.status(401).json({
      error: 'Token refresh failed',
      message: 'Invalid or expired token'
    });
  }
});

// Test database connection
router.get('/debug/test', async (req, res) => {
  try {
    // Test database connection
    const isConnected = await isDatabaseConnected();
    
    if (!isConnected) {
      return res.status(503).json({
        error: 'Database unavailable',
        message: 'Database is not connected'
      });
    }

    // Test basic query
    const userCount = await User.count();
    
    res.json({
      message: 'Database test successful',
      connected: true,
      userCount: userCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      error: 'Database test failed',
      message: error.message,
      connected: false
    });
  }
});

// Debug endpoint to check users (remove in production)
router.get('/debug/users', async (req, res) => {
  try {
    // Check if database is connected
    if (!(await isDatabaseConnected())) {
      return res.status(503).json({
        error: 'Database unavailable',
        message: 'Database is not connected'
      });
    }

    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'firstName', 'lastName', 'isActive', 'createdAt']
    });

    res.json({
      message: 'Users found',
      count: users.length,
      users: users.map(user => user.toJSON())
    });
  } catch (error) {
    console.error('Debug users error:', error);
    res.status(500).json({
      error: 'Debug failed',
      message: error.message
    });
  }
});

// Test registration endpoint (remove in production)
router.post('/debug/register-test', async (req, res) => {
  try {
    // Check if database is connected
    if (!(await isDatabaseConnected())) {
      return res.status(503).json({
        error: 'Database unavailable',
        message: 'Database is not connected'
      });
    }

    // Create a test user
    const testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'TestPassword123',
      phoneNumber: '+1234567890',
      firstName: 'Test',
      lastName: 'User'
    });

    // Generate token
    const token = generateToken(testUser.id);

    res.status(201).json({
      message: 'Test user created successfully',
      token,
      user: testUser.getProfile()
    });
  } catch (error) {
    console.error('Test registration error:', error);
    res.status(500).json({
      error: 'Test registration failed',
      message: error.message
    });
  }
});

module.exports = router; 