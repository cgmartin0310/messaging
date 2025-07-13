const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { User, Contact } = require('../models');
const sequelize = require('../config/database');

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

// Get user profile with contacts
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    // Check if database is connected
    if (!(await isDatabaseConnected())) {
      return res.status(503).json({
        error: 'Database unavailable',
        message: 'Database is not connected. Please try again later or contact support.'
      });
    }

    const userId = req.user.id;

    // Get user's contacts
    const userContacts = await Contact.findAll({
      where: { isActive: true },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'firstName', 'lastName', 'avatar', 'lastSeen']
        }
      ]
    });

    // Get all users as potential contacts (excluding current user)
    const potentialContacts = await User.findAll({
      where: {
        id: { [sequelize.Sequelize.Op.ne]: userId },
        isActive: true
      },
      attributes: ['id', 'username', 'firstName', 'lastName', 'avatar', 'lastSeen']
    });

    // Format contacts for frontend
    const formattedContacts = userContacts.map(contact => ({
      id: contact.id,
      contactType: contact.contactType,
      userId: contact.userId,
      phoneNumber: contact.phoneNumber,
      firstName: contact.firstName,
      lastName: contact.lastName,
      displayName: contact.getDisplayName(),
      avatar: contact.avatar,
      email: contact.email,
      notes: contact.notes,
      createdAt: contact.createdAt
    }));

    // Format potential contacts for frontend
    const formattedPotentialContacts = potentialContacts.map(contact => ({
      id: contact.id,
      username: contact.username,
      firstName: contact.firstName,
      lastName: contact.lastName,
      displayName: `${contact.firstName} ${contact.lastName}`,
      avatar: contact.avatar,
      lastSeen: contact.lastSeen
    }));

    res.json({
      user: req.user.getProfile(),
      contacts: formattedContacts,
      potentialContacts: formattedPotentialContacts
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

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    // Check if database is connected
    if (!(await isDatabaseConnected())) {
      return res.status(503).json({
        error: 'Database unavailable',
        message: 'Database is not connected. Please try again later or contact support.'
      });
    }

    const userId = req.user.id;
    const { firstName, lastName, avatar } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User does not exist'
      });
    }

    // Update user fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: user.getProfile()
    });
  } catch (error) {
    console.error('Profile update error:', error);
    
    // Check if it's a database connection error
    if (error.name === 'SequelizeConnectionError' || error.name === 'SequelizeHostNotFoundError') {
      return res.status(503).json({
        error: 'Database unavailable',
        message: 'Database is not connected. Please try again later or contact support.'
      });
    }
    
    res.status(500).json({
      error: 'Profile update failed',
      message: 'An error occurred while updating profile'
    });
  }
});

// Get all users (for admin purposes)
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Check if database is connected
    if (!(await isDatabaseConnected())) {
      return res.status(503).json({
        error: 'Database unavailable',
        message: 'Database is not connected. Please try again later or contact support.'
      });
    }

    const users = await User.findAll({
      where: { isActive: true },
      attributes: ['id', 'username', 'firstName', 'lastName', 'avatar', 'lastSeen', 'createdAt']
    });

    res.json({
      users: users.map(user => user.getProfile())
    });
  } catch (error) {
    console.error('Get users error:', error);
    
    // Check if it's a database connection error
    if (error.name === 'SequelizeConnectionError' || error.name === 'SequelizeHostNotFoundError') {
      return res.status(503).json({
        error: 'Database unavailable',
        message: 'Database is not connected. Please try again later or contact support.'
      });
    }
    
    res.status(500).json({
      error: 'Users retrieval failed',
      message: 'An error occurred while retrieving users'
    });
  }
});

module.exports = router; 