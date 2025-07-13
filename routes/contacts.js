const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { User, Contact } = require('../models');

// Get all contacts for the current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const contacts = await Contact.findAll({
      where: { isActive: true },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'firstName', 'lastName', 'avatar', 'lastSeen', 'isActive']
        }
      ],
      order: [['firstName', 'ASC'], ['lastName', 'ASC']]
    });

    res.json({
      success: true,
      contacts: contacts.map(contact => contact.getContactInfo())
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contacts'
    });
  }
});

// Get a specific contact
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const contact = await Contact.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'firstName', 'lastName', 'avatar', 'lastSeen', 'isActive']
        }
      ]
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found'
      });
    }

    res.json({
      success: true,
      contact: contact.getContactInfo()
    });
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contact'
    });
  }
});

// Create a new external contact
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName, phoneNumber, displayName, email, notes } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'First name, last name, and phone number are required'
      });
    }

    // Check if contact already exists
    const existingContact = await Contact.findOne({
      where: { phoneNumber }
    });

    if (existingContact) {
      return res.status(400).json({
        success: false,
        error: 'Contact with this phone number already exists'
      });
    }

    const contact = await Contact.createExternalContact({
      firstName,
      lastName,
      phoneNumber,
      displayName,
      email,
      notes
    });

    res.status(201).json({
      success: true,
      contact: contact.getContactInfo()
    });
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create contact'
    });
  }
});

// Update a contact
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const contact = await Contact.findByPk(req.params.id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found'
      });
    }

    const { firstName, lastName, displayName, email, notes } = req.body;

    await contact.update({
      firstName: firstName || contact.firstName,
      lastName: lastName || contact.lastName,
      displayName: displayName || contact.displayName,
      email: email || contact.email,
      notes: notes || contact.notes
    });

    res.json({
      success: true,
      contact: contact.getContactInfo()
    });
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update contact'
    });
  }
});

// Delete a contact (soft delete)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const contact = await Contact.findByPk(req.params.id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found'
      });
    }

    await contact.update({ isActive: false });

    res.json({
      success: true,
      message: 'Contact deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete contact'
    });
  }
});

// Get all app users as potential contacts
router.get('/users/list', authenticateToken, async (req, res) => {
  try {
    const users = await User.findAll({
      where: { 
        isActive: true,
        id: { [require('sequelize').Op.ne]: req.user.id } // Exclude current user
      },
      attributes: ['id', 'username', 'firstName', 'lastName', 'avatar', 'lastSeen', 'phoneNumber', 'email'],
      order: [['firstName', 'ASC'], ['lastName', 'ASC']]
    });

    res.json({
      success: true,
      users: users.map(user => ({
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: `${user.firstName} ${user.lastName}`,
        avatar: user.avatar,
        lastSeen: user.lastSeen,
        phoneNumber: user.phoneNumber,
        email: user.email
      }))
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});

// Add a user as a contact
router.post('/users/:userId', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if contact already exists for this user
    const existingContact = await Contact.findOne({
      where: { userId: user.id }
    });

    if (existingContact) {
      return res.status(400).json({
        success: false,
        error: 'Contact already exists for this user'
      });
    }

    const contact = await Contact.createFromUser(user);

    res.status(201).json({
      success: true,
      contact: contact.getContactInfo()
    });
  } catch (error) {
    console.error('Error adding user as contact:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add user as contact'
    });
  }
});

module.exports = router; 