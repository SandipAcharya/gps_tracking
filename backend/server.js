require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const profileRoutes = require('./routes/profile');
const destinationRoutes = require('./routes/destinations');
const adminRoutes = require('./routes/admin');
const LocationHistory = require('./models/LocationHistory');
const Organization = require('./models/Organization');
const Destination = require('./models/Destination');
const Visit = require('./models/Visit');
const User = require('./models/User');

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
app.use('/api/profile', profileRoutes);
app.use('/api/destinations', destinationRoutes);
app.use('/api/admin', adminRoutes);

// Helper for Haversine distance in meters
const getDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  const R = 6371e3; // Earth radius in meters
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

// ─── Background Location Sync ──────────────────────────
const bgTracking = {}; // In-memory tracker for users without active sockets
app.post('/api/location/background', async (req, res) => {
  const { userId, organization, lat, lng } = req.body;
  if (!userId || !organization || !lat || !lng) return res.status(400).json({ error: 'Missing data' });

  try {
    const user = await User.findById(userId);
    const org = await Organization.findOne({ name: organization });
    if (!user || !org) return res.status(404).json({ error: 'User or Org not found' });

    if (!bgTracking[userId]) bgTracking[userId] = { arrivedDests: new Map(), lastSavedLat: null, lastSavedLng: null };
    const session = bgTracking[userId];
    const distance = getDistance(session.lastSavedLat, session.lastSavedLng, lat, lng);

    if (!activeRooms[organization]) activeRooms[organization] = {};
    let existingSessionKey = Object.keys(activeRooms[organization]).find(key => activeRooms[organization][key].userId === userId);
    if (!existingSessionKey) {
      existingSessionKey = `bg_${userId}`;
      activeRooms[organization][existingSessionKey] = {
        socketId: existingSessionKey,
        userId: user._id.toString(),
        name: user.name,
        designation: user.designation,
        email: user.email,
        role: user.role,
        trackingMode: user.trackingMode || 'full',
        arrivedDests: new Map()
      };
    }
    
    const activeSession = activeRooms[organization][existingSessionKey];
    activeSession.lat = lat;
    activeSession.lng = lng;
    
    if (io) io.to(organization).emit('org_users', Object.values(activeRooms[organization]));

    if (distance > 200 || distance === Infinity || !session.lastSavedLat) {
       if (user.trackingMode === 'full') {
          await LocationHistory.create({ userId, orgId: org._id, lat, lng });
       }
       session.lastSavedLat = lat;
       session.lastSavedLng = lng;
       activeSession.lastSavedLat = lat;
       activeSession.lastSavedLng = lng;

       const dests = await Destination.find({ orgId: org._id });
       for (const d of dests) {
          const distToDest = getDistance(lat, lng, d.lat, d.lng);
          const destIdStr = d._id.toString();
          if (distToDest <= d.radius) {
            if (!session.arrivedDests.has(destIdStr)) {
               const visit = await Visit.create({ userId, orgId: org._id, destinationId: d._id, entryTime: new Date() });
               session.arrivedDests.set(destIdStr, visit._id);
               activeSession.arrivedDests.set(destIdStr, visit._id);
               if (io) io.to(organization).emit('geofence_arrival', { employeeName: user.name, destinationName: `${d.tag || 'Location'}: ${d.name}`, timestamp: new Date() });
            }
          } else {
             if (session.arrivedDests.has(destIdStr)) {
                const visitId = session.arrivedDests.get(destIdStr);
                await Visit.findByIdAndUpdate(visitId, { exitTime: new Date() }).catch(console.error);
                session.arrivedDests.delete(destIdStr);
                activeSession.arrivedDests.delete(destIdStr);
             }
          }
       }
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

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
      trackingMode: userProfile.trackingMode || 'full',
      lat: null,
      lng: null
    };

    io.to(organization).emit('org_users', Object.values(activeRooms[organization]));
    console.log(`${userProfile.name} joined org: ${organization}`);
  });

  // Helper for Haversine distance in meters
  const getDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    const R = 6371e3; // Earth radius in meters
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLon = (lon2 - lon1) * rad;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  socket.on('update_location', async ({ organization, lat, lng }) => {
    const userSession = activeRooms[organization]?.[socket.id];
    if (userSession) {
      // Compare against the last point we SAVED to the DB, not just the last ping
      const distance = getDistance(userSession.lastSavedLat || userSession.lat, userSession.lastSavedLng || userSession.lng, lat, lng);
      
      userSession.lat = lat;
      userSession.lng = lng;
      io.to(organization).emit('org_users', Object.values(activeRooms[organization]));

      // Geofence Checking (in-memory throttle to avoid DB spam - check every ping, but we'll fetch dests quickly)
      // For simplicity in this demo, we'll just query Destination if we haven't in a while, or let the admin handle it.
      // Let's do it on every DB save (>200m) to save resources, plus every time they first join.
      if (distance > 200 || distance === Infinity || !userSession.lastSavedLat) {
        try {
          const org = await Organization.findOne({ name: organization });
          if (org) {
            // Only save continuous GPS trail for 'full' tracking mode
            if (userSession.trackingMode === 'full') {
              await LocationHistory.create({
                userId: userSession.userId,
                orgId: org._id,
                lat, lng
              });
            }
            // Also store lastSaved to track the 200m jump from the *last saved* point
            userSession.lastSavedLat = lat;
            userSession.lastSavedLng = lng;

            // Geofence Check
            const dests = await Destination.find({ orgId: org._id });
            for (const d of dests) {
              const distToDest = getDistance(lat, lng, d.lat, d.lng);
              if (distToDest <= d.radius) {
                // If they just entered
                if (!userSession.arrivedDests) userSession.arrivedDests = new Map();
                if (!userSession.arrivedDests.has(d._id.toString())) {
                  // Create Visit in DB
                  const visit = await Visit.create({
                    userId: userSession.userId,
                    orgId: org._id,
                    destinationId: d._id,
                    entryTime: new Date()
                  });
                  userSession.arrivedDests.set(d._id.toString(), visit._id);
                  
                  // Emit to all users in the org
                  io.to(organization).emit('geofence_arrival', {
                    employeeName: userSession.name,
                    destinationName: `${d.tag || 'Location'}: ${d.name}`,
                    timestamp: new Date()
                  });
                }
              } else {
                // If they left, update Visit and remove from memory
                if (userSession.arrivedDests?.has(d._id.toString())) {
                  const visitId = userSession.arrivedDests.get(d._id.toString());
                  if (visitId) {
                    await Visit.findByIdAndUpdate(visitId, { exitTime: new Date() }).catch(console.error);
                  }
                  userSession.arrivedDests.delete(d._id.toString());
                }
              }
            }
          }
        } catch (e) {
          console.error('Error saving location history:', e.message);
        }
      }
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
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);

      // ─── Keep-Alive Ping (prevents Render free tier from sleeping) ───
      // Pings the health endpoint every 14 minutes (Render sleeps after 15 min)
      const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${PORT}`;
      setInterval(async () => {
        try {
          const res = await fetch(`${BACKEND_URL}/api/health`);
          console.log(`[Keep-Alive] Pinged at ${new Date().toISOString()} — status: ${res.status}`);
        } catch (e) {
          console.warn(`[Keep-Alive] Ping failed: ${e.message}`);
        }
      }, 14 * 60 * 1000); // every 14 minutes
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

