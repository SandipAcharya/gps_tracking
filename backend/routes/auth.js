const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Organization = require('../models/Organization');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_in_prod';

// 1. User Registration
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, designation, department } = req.body;
    
    if (!name || !email || !phone || !password || !designation || !department) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    let user = await User.findOne({ email: email.toLowerCase() });
    if (user) return res.status(400).json({ error: 'Email already registered.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    user = await User.create({
      name, email: email.toLowerCase(), phone, password: hashedPassword, designation, department
    });

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, user: { id: user._id, name, email, phone, role: 'none', activeOrganization: null } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

// 2. User Login
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) return res.status(400).json({ error: 'Missing credentials.' });

    const isEmail = identifier.includes('@');
    const user = await User.findOne(
      isEmail ? { email: identifier.toLowerCase() } : { phone: identifier }
    ).populate('activeOrganization');

    if (!user) return res.status(400).json({ error: 'Invalid credentials.' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: 'Invalid credentials.' });

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '12h' });
    
    res.json({ 
      token, 
      user: {
        id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone,
        designation: user.designation,
        activeOrganization: user.activeOrganization ? user.activeOrganization.name : null
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed.' });
  }
});

// 3. Create Organization (Admin)
router.post('/org/create', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized.' });

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const { name, password } = req.body;
    if (!name || !password) return res.status(400).json({ error: 'Org name and password required.' });

    const existing = await Organization.findOne({ name });
    if (existing) return res.status(400).json({ error: 'Organization name already taken.' });

    const org = await Organization.create({
      name,
      password, // In a real app we might hash this, but simple text is fine for shared room passwords
      createdBy: decoded.userId
    });

    // Update user
    const user = await User.findByIdAndUpdate(decoded.userId, {
      activeOrganization: org._id,
      role: 'admin'
    }, { new: true }).populate('activeOrganization');

    res.json({
      user: {
        id: user._id, name: user.name, email: user.email, role: user.role,
        activeOrganization: org.name
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create organization.' });
  }
});

// 4. Join Organization (Employee)
router.post('/org/join', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized.' });

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const { name, password } = req.body;
    if (!name || !password) return res.status(400).json({ error: 'Org name and password required.' });

    const org = await Organization.findOne({ name });
    if (!org) return res.status(404).json({ error: 'Organization not found.' });
    if (org.password !== password) return res.status(401).json({ error: 'Incorrect organization password.' });

    const user = await User.findByIdAndUpdate(decoded.userId, {
      activeOrganization: org._id,
      role: 'employee'
    }, { new: true }).populate('activeOrganization');

    res.json({
      user: {
        id: user._id, name: user.name, email: user.email, role: user.role,
        activeOrganization: org.name
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to join organization.' });
  }
});

// 5. Get Current User
router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const user = await User.findById(decoded.userId).populate('activeOrganization');
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      user: {
        id: user._id, name: user.name, email: user.email, role: user.role,
        designation: user.designation, phone: user.phone,
        activeOrganization: user.activeOrganization ? user.activeOrganization.name : null
      }
    });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
