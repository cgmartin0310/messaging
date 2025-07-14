const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const twilioNumberService = require('../services/twilioNumberService');

// Get all Twilio numbers (available and assigned)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const numbers = twilioNumberService.getAllNumbers();
    res.json({
      numbers: numbers
    });
  } catch (error) {
    console.error('Error getting Twilio numbers:', error);
    res.status(500).json({ error: 'Failed to get Twilio numbers' });
  }
});

// Add a new Twilio number to the pool
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const result = await twilioNumberService.addNumber(phoneNumber);
    
    if (result.success) {
      res.json({
        message: result.message,
        number: result.number
      });
    } else {
      res.status(400).json({
        error: 'Failed to add Twilio number',
        message: result.error
      });
    }
  } catch (error) {
    console.error('Error adding Twilio number:', error);
    res.status(500).json({ error: 'Failed to add Twilio number' });
  }
});

// Remove a Twilio number from the pool
router.delete('/:phoneNumber', authenticateToken, async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    
    const result = await twilioNumberService.removeNumber(phoneNumber);
    
    if (result.success) {
      res.json({
        message: result.message,
        number: result.number
      });
    } else {
      res.status(400).json({
        error: 'Failed to remove Twilio number',
        message: result.error
      });
    }
  } catch (error) {
    console.error('Error removing Twilio number:', error);
    res.status(500).json({ error: 'Failed to remove Twilio number' });
  }
});

// Assign a Twilio number to a user
router.post('/assign', authenticateToken, async (req, res) => {
  try {
    const { userId, phoneNumber } = req.body;
    
    if (!userId || !phoneNumber) {
      return res.status(400).json({ error: 'User ID and phone number are required' });
    }

    const result = await twilioNumberService.assignNumberToUser(userId, phoneNumber);
    
    if (result.success) {
      res.json({
        message: result.message,
        number: result.number
      });
    } else {
      res.status(400).json({
        error: 'Failed to assign Twilio number',
        message: result.error
      });
    }
  } catch (error) {
    console.error('Error assigning Twilio number:', error);
    res.status(500).json({ error: 'Failed to assign Twilio number' });
  }
});

// Get available Twilio numbers
router.get('/available', authenticateToken, async (req, res) => {
  try {
    const availableNumbers = twilioNumberService.getAvailableNumbers();
    res.json({
      availableNumbers: availableNumbers
    });
  } catch (error) {
    console.error('Error getting available Twilio numbers:', error);
    res.status(500).json({ error: 'Failed to get available Twilio numbers' });
  }
});

// Initialize with main Twilio number (for testing)
router.post('/init', authenticateToken, async (req, res) => {
  try {
    const mainNumber = process.env.TWILIO_PHONE_NUMBER;
    if (!mainNumber) {
      return res.status(400).json({ error: 'TWILIO_PHONE_NUMBER not set' });
    }

    const result = await twilioNumberService.addNumber(mainNumber);
    
    if (result.success) {
      res.json({
        message: 'Twilio number pool initialized',
        number: result.number
      });
    } else {
      res.status(400).json({
        error: 'Failed to initialize Twilio number pool',
        message: result.error
      });
    }
  } catch (error) {
    console.error('Error initializing Twilio number pool:', error);
    res.status(500).json({ error: 'Failed to initialize Twilio number pool' });
  }
});

// Get assigned Twilio numbers
router.get('/assigned', authenticateToken, async (req, res) => {
  try {
    const assignedNumbers = twilioNumberService.getAssignedNumbers();
    res.json({
      assignedNumbers: assignedNumbers
    });
  } catch (error) {
    console.error('Error getting assigned Twilio numbers:', error);
    res.status(500).json({ error: 'Failed to get assigned Twilio numbers' });
  }
});

module.exports = router; 