const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const LocationHistory = require('../models/LocationHistory');
const Visit = require('../models/Visit');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_in_prod';

// Middleware to verify token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized.' });
  try {
    const token = authHeader.split(' ')[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token.' });
  }
};

// Get User Profile & Location History
router.get('/:userId', verifyToken, async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const requesterId = req.user.userId;

    // Fetch requester and target
    const requester = await User.findById(requesterId);
    const target = await User.findById(targetUserId);

    if (!requester || !target) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Authorization: User can view their own profile, OR Admin can view anyone in their org
    const isSelf = requester._id.toString() === target._id.toString();
    const isAdmin = requester.role === 'admin' && requester.activeOrganization?.toString() === target.activeOrganization?.toString();

    if (!isSelf && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden. You do not have permission to view this profile.' });
    }

    // Fetch the last 3 days of location history (TTL index handles deletion, but we limit to 3 days explicitly just in case)
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const history = await LocationHistory.find({
      userId: targetUserId,
      timestamp: { $gte: threeDaysAgo }
    }).sort({ timestamp: 1 }); // Chronological order

    // Fetch Visits (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const visits = await Visit.find({
      userId: targetUserId,
      entryTime: { $gte: thirtyDaysAgo }
    }).populate('destinationId').sort({ entryTime: -1 });

    res.json({
      user: {
        id: target._id,
        name: target.name,
        email: target.email,
        phone: target.phone,
        designation: target.designation,
        department: target.department,
        avatar: target.avatar,
        role: target.role
      },
      history: history.map(h => ({
        lat: h.lat,
        lng: h.lng,
        timestamp: h.timestamp
      })),
      visits: visits.map(v => ({
        id: v._id,
        destinationName: v.destinationId ? v.destinationId.name : 'Unknown Destination',
        tag: v.destinationId ? v.destinationId.tag : 'Other',
        entryTime: v.entryTime,
        exitTime: v.exitTime
      }))
    });

  } catch (err) {
    console.error('Profile API Error:', err);
    res.status(500).json({ error: 'Server error fetching profile.' });
  }
});

module.exports = router;
