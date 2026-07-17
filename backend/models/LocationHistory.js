const mongoose = require('mongoose');

const locationHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now }
});

// TTL Index: Automatically delete documents 3 days (259200 seconds) after their timestamp
locationHistorySchema.index({ timestamp: 1 }, { expireAfterSeconds: 259200 });
// Optimize querying a user's history
locationHistorySchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('LocationHistory', locationHistorySchema);
