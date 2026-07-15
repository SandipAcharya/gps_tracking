const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_in_prod';
const OTP_EXPIRY_MINUTES = 10;

// ─── OTP Generator ───────────────────────────────────
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// ─── Email Transporter (Gmail SMTP via App Password) ──
const createTransporter = () => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASS) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASS }
  });
};

// ─── Step 1: Request OTP ─────────────────────────────
// POST /api/auth/request-otp
// Body: { identifier: "email@... or +977..." }
router.post('/request-otp', async (req, res) => {
  const { identifier } = req.body;
  if (!identifier) return res.status(400).json({ error: 'Email or phone number is required.' });

  const isEmail = identifier.includes('@');
  const isPhone = /^\+?[\d\s\-()]{7,15}$/.test(identifier);
  if (!isEmail && !isPhone) return res.status(400).json({ error: 'Please enter a valid email or phone number.' });

  try {
    const query = isEmail ? { email: identifier.toLowerCase() } : { phone: identifier };
    let user = await User.findOne(query);

    if (!user) {
      user = await User.create(query);
    }

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    await user.save();

    // Send OTP via email
    if (isEmail) {
      const transporter = createTransporter();
      if (transporter) {
        await transporter.sendMail({
          from: `"GeoTracker" <${process.env.GMAIL_USER}>`,
          to: identifier,
          subject: 'Your GeoTracker OTP Code',
          html: `
            <div style="font-family: Inter, sans-serif; max-width: 480px; margin: auto; padding: 2rem; background: #f9fafb; border-radius: 12px;">
              <h2 style="color: #1a1a2e;">Your verification code</h2>
              <p style="color: #6b7280;">Use this code to log in to GeoTracker. It expires in ${OTP_EXPIRY_MINUTES} minutes.</p>
              <div style="font-size: 2.5rem; font-weight: 800; letter-spacing: 0.5rem; color: #6366f1; text-align: center; padding: 1.5rem; background: white; border-radius: 8px; margin: 1rem 0;">
                ${otp}
              </div>
              <p style="color: #9ca3af; font-size: 0.8rem;">If you didn't request this, ignore this email.</p>
            </div>
          `
        });
        console.log(`OTP sent to email: ${identifier}`);
      } else {
        // Dev fallback — log OTP to console
        console.log(`⚠️  DEV MODE: OTP for ${identifier} → ${otp}`);
      }
    } else {
      // Phone OTP — log for now (integrate Twilio/Vonage when ready)
      console.log(`⚠️  DEV MODE: OTP for ${identifier} → ${otp}`);
    }

    res.json({ 
      message: `OTP sent to ${isEmail ? 'email' : 'phone'}`, 
      isEmail,
      // DEV ONLY — remove in production
      devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
  }
});

// ─── Step 2: Verify OTP ──────────────────────────────
// POST /api/auth/verify-otp
// Body: { identifier, otp }
router.post('/verify-otp', async (req, res) => {
  const { identifier, otp } = req.body;
  if (!identifier || !otp) return res.status(400).json({ error: 'Identifier and OTP are required.' });

  const isEmail = identifier.includes('@');
  const query = isEmail ? { email: identifier.toLowerCase() } : { phone: identifier };

  try {
    const user = await User.findOne(query);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (!user.otp || user.otp !== otp) return res.status(401).json({ error: 'Invalid OTP.' });
    if (new Date() > user.otpExpiresAt) return res.status(401).json({ error: 'OTP has expired. Please request a new one.' });

    // Clear OTP after successful use
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

    // Issue JWT
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
        profileComplete: user.profileComplete
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Verification failed.' });
  }
});

// ─── Step 3: Complete Profile ─────────────────────────
// POST /api/auth/complete-profile
// Body: { name, phone, designation, office }   Header: Authorization: Bearer <token>
router.post('/complete-profile', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized.' });

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const { name, phone, designation, office } = req.body;

    if (!name || !designation || !office) {
      return res.status(400).json({ error: 'Name, designation, and office are required.' });
    }

    const user = await User.findByIdAndUpdate(
      decoded.userId,
      { name, phone: phone || undefined, designation, office, profileComplete: true },
      { new: true }
    );

    res.json({
      user: {
        id: user._id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        designation: user.designation,
        office: user.office,
        role: user.role,
        profileComplete: user.profileComplete
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Profile update failed.' });
  }
});

// ─── GET /api/auth/me — Validate token & return user ─
router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized.' });

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-otp -otpExpiresAt');
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ user });
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
});

module.exports = router;
