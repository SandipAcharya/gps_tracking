const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Destination = require('../models/Destination');
const Organization = require('../models/Organization');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_in_prod';

// Middleware to verify token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized.' });
  try {
    const token = authHeader.split(' ')[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token.' });
  }
};

// Get all destinations for an organization
router.get('/:orgName', verifyToken, async (req, res) => {
  try {
    const org = await Organization.findOne({ name: req.params.orgName });
    if (!org) return res.status(404).json({ error: 'Organization not found' });
    
    const destinations = await Destination.find({ orgId: org._id });
    res.json(destinations);
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching destinations' });
  }
});

// Create a new destination (Admin only)
router.post('/', verifyToken, async (req, res) => {
  try {
    const { orgName, name, lat, lng, radius } = req.body;
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

    const org = await Organization.findOne({ name: orgName });
    if (!org) return res.status(404).json({ error: 'Organization not found' });

    const dest = new Destination({ orgId: org._id, name, lat, lng, radius: radius || 50 });
    await dest.save();

    res.status(201).json(dest);
  } catch (err) {
    res.status(500).json({ error: 'Server error creating destination' });
  }
});

// Delete a destination (Admin only)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    await Destination.findByIdAndDelete(req.params.id);
    res.json({ message: 'Destination deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error deleting destination' });
  }
});

module.exports = router;
