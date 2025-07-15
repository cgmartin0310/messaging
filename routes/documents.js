const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const Document = require('../models/Document');
const router = express.Router({ mergeParams: true });

router.get('/', authenticateToken, async (req, res) => {
  const documents = await Document.findAll({ where: { patientId: req.params.patientId } });
  res.json(documents);
});

router.post('/', authenticateToken, async (req, res) => {
  const document = await Document.create({ ...req.body, patientId: req.params.patientId });
  res.status(201).json(document);
});

// Add PUT and DELETE
module.exports = router; 