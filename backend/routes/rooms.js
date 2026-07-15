const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const jwt = require('jsonwebtoken');

const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_in_prod';

// ─── Middleware: verify JWT ───────────────────────────
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized.' });
  try {
    const token = authHeader.split(' ')[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

// ─── Middleware: admin only (reads from DB, not JWT) ──
const requireAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select('role');
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can perform this action.' });
    }
    next();
  } catch {
    res.status(500).json({ error: 'Authorization check failed.' });
  }
};

// GET /api/rooms — List all rooms (just id, company, no password)
router.get('/', requireAuth, async (req, res) => {
  try {
    const rooms = await Room.find().select('roomId company createdAt').lean();
    res.json({ rooms });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rooms.' });
  }
});

// POST /api/rooms/create — Admin only
router.post('/create', requireAuth, requireAdmin, async (req, res) => {
  const { roomId, password, company } = req.body;
  if (!roomId || !password) return res.status(400).json({ error: 'Room ID and password are required.' });

  try {
    const exists = await Room.findOne({ roomId });
    if (exists) return res.status(409).json({ error: 'A room with this ID already exists.' });

    const passwordHash = await Room.hashPassword(password);
    await Room.create({ roomId, passwordHash, company: company || roomId, createdBy: req.user.userId });

    res.status(201).json({ message: `Room "${roomId}" created successfully.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create room.' });
  }
});

// POST /api/rooms/join — Any authenticated user
router.post('/join', requireAuth, async (req, res) => {
  const { roomId, password } = req.body;
  if (!roomId || !password) return res.status(400).json({ error: 'Room ID and password are required.' });

  try {
    const room = await Room.findOne({ roomId });
    if (!room) return res.status(404).json({ error: 'Room not found.' });

    const isMatch = await room.verifyPassword(password);
    if (!isMatch) return res.status(401).json({ error: 'Incorrect password.' });

    res.json({ message: 'Access granted.', roomId: room.roomId, company: room.company });
  } catch (err) {
    res.status(500).json({ error: 'Failed to join room.' });
  }
});

// DELETE /api/rooms/:roomId — Admin only
router.delete('/:roomId', requireAuth, requireAdmin, async (req, res) => {
  try {
    await Room.findOneAndDelete({ roomId: req.params.roomId });
    res.json({ message: 'Room deleted.' });
  } catch {
    res.status(500).json({ error: 'Failed to delete room.' });
  }
});

module.exports = router;
