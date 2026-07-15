const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const roomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true, trim: true },
  
  // Hashed password — never store plain text
  passwordHash: { type: String, required: true },

  // Which company/org this room belongs to
  company: { type: String, trim: true },

  // Reference to admin who created it
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  createdAt: { type: Date, default: Date.now }
});

// Method to verify password
roomSchema.methods.verifyPassword = async function(plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

// Static to hash password before saving
roomSchema.statics.hashPassword = async function(plain) {
  return bcrypt.hash(plain, 10);
};

module.exports = mongoose.model('Room', roomSchema);
