const express = require('express');
const { body, validationResult } = require('express-validator');
const authenticateToken = require('../middleware/auth');
const { Group, GroupContact } = require('../models/Group');
const Contact = require('../models/Contact');
const router = express.Router();

// Get all groups for current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const groups = await Group.findAll({
      where: { userId: req.user.id },
      include: [{ model: Contact, through: GroupContact }]
    });
    res.json({ groups });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// Create new group
router.post('/', authenticateToken, [
  body('name').trim().notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { name, description, contactIds = [] } = req.body;
    const group = await Group.create({ name, description, userId: req.user.id });
    if (contactIds.length > 0) {
      await group.addContacts(contactIds);
    }
    res.status(201).json({ group });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// Get group details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const group = await Group.findOne({
      where: { id: req.params.id, userId: req.user.id },
      include: [{ model: Contact, through: GroupContact }]
    });
    if (!group) return res.status(404).json({ error: 'Group not found' });
    res.json({ group });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch group' });
  }
});

// Update group
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const group = await Group.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!group) return res.status(404).json({ error: 'Group not found' });
    const { name, description, contactIds } = req.body;
    await group.update({ name, description });
    if (contactIds) {
      await group.setContacts(contactIds);
    }
    res.json({ group });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update group' });
  }
});

// Delete group
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const group = await Group.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!group) return res.status(404).json({ error: 'Group not found' });
    await group.destroy();
    res.json({ message: 'Group deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

module.exports = router; 