const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Organization = require('../models/Organization');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_in_prod';

const verifyAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized.' });
  try {
    const token = authHeader.split(' ')[1];
    req.user = jwt.verify(token, JWT_SECRET);
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required.' });
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token.' });
  }
};

// GET /api/admin/employees?orgName=xxx — list all users in org
router.get('/employees', verifyAdmin, async (req, res) => {
  try {
    const { orgName } = req.query;
    const org = await Organization.findOne({ name: orgName });
    if (!org) return res.status(404).json({ error: 'Organization not found.' });

    const employees = await User.find(
      { activeOrganization: org._id },
      'name email phone designation department role createdAt'
    ).sort({ createdAt: -1 });

    res.json(employees);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// PATCH /api/admin/employees/:userId — update role
router.patch('/employees/:userId', verifyAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'employee', 'none'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role.' });
    }
    const updated = await User.findByIdAndUpdate(
      req.params.userId,
      { role },
      { new: true, select: 'name email role department designation' }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// DELETE /api/admin/employees/:userId — remove from org
router.delete('/employees/:userId', verifyAdmin, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.userId, { activeOrganization: null });
    res.json({ message: 'Employee removed from org.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
