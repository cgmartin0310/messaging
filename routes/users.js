const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { User } = require('../models');
const virtualPhoneService = require('../services/virtualPhoneService');

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });
    
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        virtualPhoneNumber: user.virtualPhoneNumber,
        avatar: user.avatar,
        isActive: user.isActive,
        lastSeen: user.lastSeen,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName, phoneNumber, virtualPhoneNumber, avatar } = req.body;
    
    console.log('Profile update request body:', req.body);
    console.log('Extracted values:', { firstName, lastName, phoneNumber, virtualPhoneNumber, avatar });
    
    const user = await User.findByPk(req.user.id);
    console.log('Current user phone number:', user.phoneNumber);
    console.log('Current user virtual phone number:', user.virtualPhoneNumber);
    
    // Clean virtual phone number if provided
    let cleanVirtualNumber = null;
    if (virtualPhoneNumber !== undefined && virtualPhoneNumber.trim()) {
      let cleanNumber = virtualPhoneNumber.trim();
      
      // Remove any non-digit characters except +
      cleanNumber = cleanNumber.replace(/[^\d+]/g, '');
      
      // Ensure it starts with +1
      if (!cleanNumber.startsWith('+1')) {
        if (cleanNumber.startsWith('1')) {
          cleanNumber = '+' + cleanNumber;
        } else if (cleanNumber.startsWith('+')) {
          // Already has +, just ensure it's +1
          if (!cleanNumber.startsWith('+1')) {
            cleanNumber = '+1' + cleanNumber.substring(1);
          }
        } else {
          // Add +1 prefix
          cleanNumber = '+1' + cleanNumber;
        }
      }
      
      // Validate final format (must be +1 followed by exactly 10 digits)
      if (!cleanNumber.match(/^\+1[0-9]{10}$/)) {
        return res.status(400).json({ 
          error: 'Invalid virtual phone number format',
          message: `Expected +1XXXXXXXXXX, got: ${cleanNumber}`
        });
      }
      
      cleanVirtualNumber = cleanNumber;
    }
    
    const updateData = {
      firstName: firstName !== undefined ? firstName : user.firstName,
      lastName: lastName !== undefined ? lastName : user.lastName,
      phoneNumber: phoneNumber !== undefined ? phoneNumber : user.phoneNumber,
      virtualPhoneNumber: cleanVirtualNumber !== null ? cleanVirtualNumber : user.virtualPhoneNumber,
      avatar: avatar !== undefined ? avatar : user.avatar
    };
    
    console.log('Update data:', updateData);
    
    await user.update(updateData);
    
    // Refresh user data from database
    await user.reload();
    
    console.log('Updated user phone number:', user.phoneNumber);
    console.log('Updated user virtual phone number:', user.virtualPhoneNumber);
    
    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        virtualPhoneNumber: user.virtualPhoneNumber,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Assign virtual phone number to current user
router.post('/virtual-number', authenticateToken, async (req, res) => {
  try {
    const result = await virtualPhoneService.assignVirtualNumber(req.user.id);
    
    if (result.success) {
      res.json({
        message: result.message,
        virtualNumber: result.virtualNumber
      });
    } else {
      res.status(400).json({
        error: 'Failed to assign virtual number',
        message: result.error
      });
    }
  } catch (error) {
    console.error('Assign virtual number error:', error);
    res.status(500).json({ error: 'Failed to assign virtual number' });
  }
});

// Remove virtual phone number from current user
router.delete('/virtual-number', authenticateToken, async (req, res) => {
  try {
    const result = await virtualPhoneService.removeVirtualNumber(req.user.id);
    
    if (result.success) {
      res.json({
        message: result.message
      });
    } else {
      res.status(400).json({
        error: 'Failed to remove virtual number',
        message: result.error
      });
    }
  } catch (error) {
    console.error('Remove virtual number error:', error);
    res.status(500).json({ error: 'Failed to remove virtual number' });
  }
});

// Get all users with virtual numbers
router.get('/virtual-numbers', authenticateToken, async (req, res) => {
  try {
    const users = await virtualPhoneService.getUsersWithVirtualNumbers();
    
    res.json({
      users: users.map(user => ({
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        virtualPhoneNumber: user.virtualPhoneNumber
      }))
    });
  } catch (error) {
    console.error('Get virtual numbers error:', error);
    res.status(500).json({ error: 'Failed to get virtual numbers' });
  }
});

// Send SMS to another internal user
router.post('/sms/internal/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { message } = req.body;
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    const result = await virtualPhoneService.sendInternalSMS(
      req.user.id,
      userId,
      message.trim()
    );
    
    if (result.success) {
      res.json({
        message: 'SMS sent successfully',
        messageId: result.messageId,
        from: result.from,
        to: result.to
      });
    } else {
      res.status(400).json({
        error: 'Failed to send SMS',
        message: result.error
      });
    }
  } catch (error) {
    console.error('Send internal SMS error:', error);
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

// Send SMS to external phone number
router.post('/sms/external', authenticateToken, async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;
    
    if (!phoneNumber || !message) {
      return res.status(400).json({ error: 'Phone number and message are required' });
    }
    
    const result = await virtualPhoneService.sendExternalSMS(
      req.user.id,
      phoneNumber,
      message.trim()
    );
    
    if (result.success) {
      res.json({
        message: 'SMS sent successfully',
        messageId: result.messageId,
        from: result.from,
        to: result.to
      });
    } else {
      res.status(400).json({
        error: 'Failed to send SMS',
        message: result.error
      });
    }
  } catch (error) {
    console.error('Send external SMS error:', error);
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

module.exports = router; 