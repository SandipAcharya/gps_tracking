const mongoose = require('mongoose');

const destinationSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  name: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  radius: { type: Number, default: 50 }, // Radius in meters
  tag: { type: String, enum: ['Client Site', 'Office', 'Warehouse', 'Restricted Zone', 'Other'], default: 'Other' }
}, { timestamps: true });

module.exports = mongoose.model('Destination', destinationSchema);
