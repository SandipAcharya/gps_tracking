const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Organization = require('../models/Organization');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_in_prod';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'acharyasandip137@gmail.com';

// SendGrid REST API — DKIM-signed, works on Render, Gmail accepts it
const sendOtpEmail = async (toEmail, toName, otp) => {
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SENDGRID_API_KEY || ''}`
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: toEmail, name: toName }] }],
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || 'acharyasandip137@gmail.com',
        name: 'Navigo Pro'
      },
      subject: 'Your Verification Code — Navigo Pro',
      content: [{
        type: 'text/html',
        value: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;background:#f9fafb;border-radius:12px;"><h2 style="color:#7c3aed;">Navigo Pro</h2><p>Hi ${toName},</p><p>Your verification code is:</p><div style="font-size:2.8rem;font-weight:900;letter-spacing:16px;color:#1e1b4b;margin:24px 0;text-align:center;">${otp}</div><p style="font-size:0.85rem;color:#6b7280;">This code expires in 10 minutes. Do not share it.</p></div>`
      }]
    })
  });
  // SendGrid returns 202 Accepted on success (no body)
  if (res.status !== 202) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(JSON.stringify(errBody.errors || errBody) || `SendGrid error ${res.status}`);
  }
};

// 1. User Registration
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, designation, department } = req.body;
    
    if (!name || !email || !phone || !password || !designation || !department) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    let user = await User.findOne({ email: email.toLowerCase() });
    if (user && user.isVerified) return res.status(400).json({ error: 'Email already registered.' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedPassword = await bcrypt.hash(password, 10);
    
    if (user && !user.isVerified) {
      // Update existing unverified user
      user.name = name;
      user.phone = phone;
      user.password = hashedPassword;
      user.designation = designation;
      user.department = department;
      user.trackingMode = (department === 'IT & Engineering' || department === 'Finance & Admin') ? 'geofence_only' : 'full';
      user.otp = otp;
      await user.save();
    } else {
      const trackingMode = (department === 'IT & Engineering' || department === 'Finance & Admin') ? 'geofence_only' : 'full';
      user = await User.create({
        name, email: email.toLowerCase(), phone, password: hashedPassword, designation, department, trackingMode, otp, isVerified: false
      });
    }

    try {
      await sendOtpEmail(user.email, user.name, otp);
      console.log('✅ OTP email sent to', user.email);
    } catch (e) {
      console.error('❌ Mail error:', e.message);
      // Still respond — OTP in logs as fallback during dev
      console.log('[DEV FALLBACK] OTP is:', otp);
    }

    res.json({ message: 'OTP sent to your email.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

// 1.5 Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (user.otp !== otp) return res.status(400).json({ error: 'Invalid OTP.' });

    user.isVerified = true;
    user.otp = null;
    // Auto-promote the designated admin email
    if (user.email === ADMIN_EMAIL) user.role = 'admin';
    await user.save();

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, activeOrganization: null } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Verification failed.' });
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

    if (!user.isVerified) return res.status(401).json({ error: 'Please verify your email first.' });

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

// 3. Create Organization (Admin only)
router.post('/org/create', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized.' });

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (user.role !== 'admin') return res.status(403).json({ error: 'Only admins can create a workspace.' });
    
    const { name, password } = req.body;
    if (!name || !password) return res.status(400).json({ error: 'Org name and password required.' });

    const existing = await Organization.findOne({ name });
    if (existing) return res.status(400).json({ error: 'Organization name already taken.' });

    const org = await Organization.create({
      name,
      password, // In a real app we might hash this, but simple text is fine for shared room passwords
      createdBy: decoded.userId
    });

    // Update user's org and role
    await User.findByIdAndUpdate(decoded.userId, {
      activeOrganization: org._id,
      role: 'admin'
    });

    res.json({
      user: {
        id: user._id, name: user.name, email: user.email, role: 'admin',
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

    let updateData = { activeOrganization: org._id };
    const currentUser = await User.findById(decoded.userId);
    if (currentUser.role === 'none') {
      updateData.role = 'employee';
    }

    const user = await User.findByIdAndUpdate(decoded.userId, updateData, { new: true }).populate('activeOrganization');

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
