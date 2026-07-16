const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  designation: { type: String, required: true },
  department: { type: String, required: true },
  
  // Organization Context
  activeOrganization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },
  role: { type: String, enum: ['admin', 'employee', 'none'], default: 'none' }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
