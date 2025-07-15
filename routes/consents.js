const express = require('express');
const { body, validationResult } = require('express-validator');
const authenticateToken = require('../middleware/auth');
const Consent = require('../models/Consent');
const router = express.Router();

// Create consent
router.post('/', authenticateToken, [
  body('contactId').optional().isUUID(),
  body('groupId').optional().isUUID(),
  body('patientId').isUUID(),
  body('consentGiven').isBoolean()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const consent = await Consent.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json({ consent });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create consent' });
  }
});

// Get consents for a contact
router.get('/:contactId', authenticateToken, async (req, res) => {
  try {
    const consents = await Consent.findAll({ where: { contactId: req.params.contactId } });
    res.json({ consents });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch consents' });
  }
});

// Update consent
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const consent = await Consent.findByPk(req.params.id);
    if (!consent) return res.status(404).json({ error: 'Consent not found' });
    await consent.update(req.body);
    res.json({ consent });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update consent' });
  }
});

// Delete consent
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const consent = await Consent.findByPk(req.params.id);
    if (!consent) return res.status(404).json({ error: 'Consent not found' });
    await consent.destroy();
    res.json({ message: 'Consent deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete consent' });
  }
});

module.exports = router; 