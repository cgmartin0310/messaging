const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const Patient = require('../models/Patient');
const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  const patients = await Patient.findAll({ where: { userId: req.user.id } });
  res.json(patients);
});

router.post('/', authenticateToken, async (req, res) => {
  const patient = await Patient.create({ ...req.body, userId: req.user.id });
  res.status(201).json(patient);
});

// Add PUT and DELETE similarly
module.exports = router; 