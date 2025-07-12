const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Middleware to authenticate JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required',
        message: 'Please provide a valid authentication token' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database using Sequelize syntax
    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password'] }
    });
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'User not found' 
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        error: 'Account deactivated',
        message: 'Your account has been deactivated' 
      });
    }

    // Update last seen
    try {
      await user.updateLastSeen();
    } catch (updateError) {
      console.error('Error updating last seen:', updateError);
      // Continue anyway - this is not critical
    }
    
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'Token is invalid or expired' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        message: 'Authentication token has expired' 
      });
    }
    
    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      error: 'Authentication error',
      message: 'Internal server error during authentication' 
    });
  }
};

// Middleware to check if user is admin of a group
const isGroupAdmin = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const { Group } = require('../models');
    const group = await Group.findByPk(groupId);
    
    if (!group) {
      return res.status(404).json({ 
        error: 'Group not found',
        message: 'The specified group does not exist' 
      });
    }

    if (!group.isAdmin(userId)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        message: 'You must be an admin to perform this action' 
      });
    }

    req.group = group;
    next();
  } catch (error) {
    console.error('Group admin middleware error:', error);
    return res.status(500).json({ 
      error: 'Authorization error',
      message: 'Internal server error during authorization' 
    });
  }
};

// Middleware to check if user is member of a group
const isGroupMember = async (req, res, next) => {
  // Defensive: check if req.user exists
  if (!req.user) {
    console.error('isGroupMember: req.user is undefined. User is not authenticated.');
    return res.status(401).json({ error: 'Unauthorized: user not authenticated' });
  }
  const userId = req.user.id;
  const groupId = req.params.groupId;
  console.log('isGroupMember: userId', userId, 'groupId', groupId);
  try {
    const { Group } = require('../models');
    const group = await Group.findByPk(groupId, {
      include: [{ model: User, as: 'members', where: { id: userId } }]
    });
    if (!group) {
      return res.status(403).json({ error: 'Forbidden: user is not a member of this group' });
    }
    next();
  } catch (err) {
    console.error('isGroupMember error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Middleware to check if user owns the message
const isMessageOwner = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const { Message } = require('../models');
    const message = await Message.findByPk(messageId);
    
    if (!message) {
      return res.status(404).json({ 
        error: 'Message not found',
        message: 'The specified message does not exist' 
      });
    }

    if (message.senderId !== userId) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You can only edit or delete your own messages' 
      });
    }

    req.message = message;
    next();
  } catch (error) {
    console.error('Message owner middleware error:', error);
    return res.status(500).json({ 
      error: 'Authorization error',
      message: 'Internal server error during authorization' 
    });
  }
};

module.exports = {
  authenticateToken,
  isGroupAdmin,
  isGroupMember,
  isMessageOwner
}; 