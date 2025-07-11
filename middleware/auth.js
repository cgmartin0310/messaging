const jwt = require('jsonwebtoken');
const User = require('../models/User');

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
    
    // Get user from database
    const user = await User.findById(decoded.userId).select('-password');
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
    await user.updateLastSeen();
    
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
    const userId = req.user._id;

    const Group = require('../models/Group');
    const group = await Group.findById(groupId);
    
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
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const Group = require('../models/Group');
    const group = await Group.findById(groupId);
    
    if (!group) {
      return res.status(404).json({ 
        error: 'Group not found',
        message: 'The specified group does not exist' 
      });
    }

    if (!group.isMember(userId)) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You must be a member of this group to perform this action' 
      });
    }

    req.group = group;
    next();
  } catch (error) {
    console.error('Group member middleware error:', error);
    return res.status(500).json({ 
      error: 'Authorization error',
      message: 'Internal server error during authorization' 
    });
  }
};

// Middleware to check if user owns the message
const isMessageOwner = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const Message = require('../models/Message');
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ 
        error: 'Message not found',
        message: 'The specified message does not exist' 
      });
    }

    if (message.sender.toString() !== userId.toString()) {
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