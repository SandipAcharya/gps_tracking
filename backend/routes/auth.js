const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_in_prod';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const createTransporter = () => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASS) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASS }
  });
};

const sendEmail = async (to, subject, html) => {
  const transporter = createTransporter();
  if (transporter) {
    await transporter.sendMail({
      from: `"GeoTracker" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html
    });
    console.log(`Email sent to: ${to}`);
  } else {
    console.log(`⚠️ DEV MODE: Email to ${to} | Subject: ${subject}`);
    console.log(`[Email Content]\n${html}\n-------------------`);
  }
};

// 1. Admin Register (Create Organization)
router.post('/register', async (req, res) => {
  const { organization, name, email, phone, password } = req.body;
  if (!organization || !name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    let user = await User.findOne({ email: email.toLowerCase() });
    if (user) return res.status(400).json({ error: 'Email already exists.' });

    const hashedPassword = await bcrypt.hash(password, 10);

    user = await User.create({
      organization,
      name,
      email: email.toLowerCase(),
      phone,
      password: hashedPassword,
      role: 'admin',
      profileComplete: true
    });

    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '12h' });

    res.json({ token, user: { id: user._id, name, email, role: 'admin', organization } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

// 2. Standard Login
router.post('/login', async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) return res.status(400).json({ error: 'Email/Phone and password required.' });

  try {
    const isEmail = identifier.includes('@');
    const query = isEmail ? { email: identifier.toLowerCase() } : { phone: identifier };

    const user = await User.findOne(query);
    if (!user) return res.status(401).json({ error: 'Invalid credentials.' });
    if (!user.password) return res.status(401).json({ error: 'Please use your invite link to set up your account first.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid email or password.' });

    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '12h' });

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        designation: user.designation,
        office: user.office,
        role: user.role,
        organization: user.organization,
        profileComplete: user.profileComplete
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed.' });
  }
});

// 3. Admin Invites Employee
router.post('/invite', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized.' });

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'Admin only.' });

    const admin = await User.findById(decoded.userId);
    const { email, designation, office } = req.body;

    if (!email) return res.status(400).json({ error: 'Employee email is required.' });

    let user = await User.findOne({ email: email.toLowerCase() });
    if (user && user.profileComplete) {
      return res.status(400).json({ error: 'User is already registered.' });
    }

    const inviteToken = crypto.randomBytes(32).toString('hex');

    if (!user) {
      user = await User.create({
        email: email.toLowerCase(),
        organization: admin.organization,
        role: 'employee',
        designation,
        office,
        inviteToken,
        inviteTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      });
    } else {
      user.inviteToken = inviteToken;
      user.inviteTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      user.designation = designation || user.designation;
      user.office = office || user.office;
      await user.save();
    }

    const setupUrl = `${CLIENT_URL}/setup?token=${inviteToken}`;
    
    await sendEmail(
      email,
      `You're invited to join ${admin.organization} on GeoTracker`,
      `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 20px; background: #f9fafb; border-radius: 8px;">
        <h2>Welcome to GeoTracker</h2>
        <p>You have been invited by ${admin.name} to join <strong>${admin.organization}</strong>.</p>
        <p>Click the button below to set up your account and password:</p>
        <a href="${setupUrl}" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">Set Up Account</a>
        <p style="margin-top: 20px; font-size: 12px; color: #6b7280;">This link expires in 24 hours.</p>
      </div>
      `
    );

    res.json({ message: 'Invite sent successfully.', inviteLink: process.env.NODE_ENV !== 'production' ? setupUrl : undefined });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send invite.' });
  }
});

// 4. Employee Finishes Setup
router.post('/setup', async (req, res) => {
  const { token, name, phone, password } = req.body;
  if (!token || !name || !phone || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    const user = await User.findOne({ 
      inviteToken: token,
      inviteTokenExpiresAt: { $gt: new Date() }
    });

    if (!user) return res.status(400).json({ error: 'Invalid or expired invite link.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    
    user.name = name;
    user.phone = phone;
    user.password = hashedPassword;
    user.profileComplete = true;
    user.inviteToken = undefined;
    user.inviteTokenExpiresAt = undefined;
    await user.save();

    const jwtToken = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '12h' });

    res.json({
      token: jwtToken,
      user: {
        id: user._id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        role: user.role,
        organization: user.organization,
        profileComplete: user.profileComplete
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Account setup failed.' });
  }
});

// 5. Get Current User
router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized.' });

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password -inviteToken -inviteTokenExpiresAt');
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ user });
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
});

module.exports = router;
