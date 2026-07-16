const mongoose = require('mongoose');

// Profile is set after OTP verification
const userSchema = new mongoose.Schema({
  // Identity — one of these is required
  email: { type: String, sparse: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, sparse: true, unique: true, trim: true },

  // Profile — filled after first login
  name: { type: String, trim: true },
  designation: { type: String, trim: true },
  office: { type: String, trim: true },
  profileComplete: { type: Boolean, default: false },

  // Organization (Multi-tenant support)
  organization: { type: String, trim: true },

  // Role — set by admin manually or at first registration
  role: { type: String, enum: ['admin', 'employee'], default: 'employee' },

  // Authentication
  password: { type: String }, // Hashed password
  
  // Magic Link / Invite State
  inviteToken: { type: String },
  inviteTokenExpiresAt: { type: Date },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
