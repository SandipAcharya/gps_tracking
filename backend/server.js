require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');

const app = express();
const server = http.createServer(app);

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_in_prod';
const CLIENT_URL = process.env.CLIENT_URL || '*';
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────
app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

// ─── Routes ───────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

// ─── Socket.io ────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: CLIENT_URL, methods: ['GET', 'POST'] }
});

// In-memory active tracking (GPS coords are transient — never stored in DB)
const activeRooms = {};

io.use((socket, next) => {
  // Authenticate socket connections via JWT
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication error'));
  try {
    socket.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id} | User: ${socket.user?.userId}`);

  socket.on('join_org', ({ organization, userProfile }) => {
    if (!organization) return;
    
    socket.join(organization);
    if (!activeRooms[organization]) activeRooms[organization] = {};

    activeRooms[organization][socket.id] = {
      socketId: socket.id,
      userId: socket.user.userId,
      name: userProfile.name,
      designation: userProfile.designation,
      email: userProfile.email,
      phone: userProfile.phone,
      role: userProfile.role,
      lat: null,
      lng: null
    };

    io.to(organization).emit('org_users', Object.values(activeRooms[organization]));
    console.log(`${userProfile.name} joined org: ${organization}`);
  });

  socket.on('update_location', ({ organization, lat, lng }) => {
    if (activeRooms[organization]?.[socket.id]) {
      activeRooms[organization][socket.id].lat = lat;
      activeRooms[organization][socket.id].lng = lng;
      io.to(organization).emit('org_users', Object.values(activeRooms[organization]));
    }
  });

  socket.on('disconnect', () => {
    for (const org in activeRooms) {
      if (activeRooms[org][socket.id]) {
        delete activeRooms[org][socket.id];
        io.to(org).emit('org_users', Object.values(activeRooms[org]));
        console.log(`${socket.id} left org: ${org}`);
        break;
      }
    }
  });
});

// ─── DB + Server Start ────────────────────────────────
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/geotracker')
  .then(() => {
    console.log('✅ MongoDB Connected');
    server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });
