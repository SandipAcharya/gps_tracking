require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');

const Room = require('./models/Room');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/geotracker');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    console.log("Please ensure MongoDB is running or MONGO_URI is set in .env");
  }
};
connectDB();

// Volatile in-memory store for active GPS tracking (Do NOT save coordinates to MongoDB every second)
const activeRooms = {};

app.get('/', (req, res) => {
  res.send('Geotracker API is running.');
});

// Join an existing room
app.post('/api/room/join', async (req, res) => {
  const { roomId, password } = req.body;
  if (!roomId || !password) {
    return res.status(400).json({ error: 'Room ID and password are required' });
  }

  try {
    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ error: 'Room not found. Only admins can create new rooms.' });
    }

    if (room.password === password) {
      // Ensure it exists in volatile memory for socket tracking
      if (!activeRooms[roomId]) activeRooms[roomId] = { users: {} };
      return res.status(200).json({ message: 'Joined room successfully' });
    } else {
      return res.status(401).json({ error: 'Incorrect room password' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error while joining room' });
  }
});

// Create a new room
app.post('/api/room/create', async (req, res) => {
  const { roomId, password, isAdmin, email } = req.body;
  if (!roomId || !password) {
    return res.status(400).json({ error: 'Room ID and password are required' });
  }

  if (!isAdmin) {
    return res.status(403).json({ error: 'Permission denied. Only admins can create rooms.' });
  }

  try {
    const existingRoom = await Room.findOne({ roomId });
    if (existingRoom) {
      return res.status(409).json({ error: 'Room already exists. Please choose a different ID.' });
    }

    const newRoom = await Room.create({
      roomId,
      password,
      createdBy: email || 'admin'
    });

    // Initialize volatile memory
    activeRooms[roomId] = { users: {} };

    return res.status(201).json({ message: 'Room created successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error while creating room' });
  }
});

// Socket.io Tracking Engine
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join_room', ({ roomId, user }) => {
    socket.join(roomId);
    
    if (!activeRooms[roomId]) {
      activeRooms[roomId] = { users: {} };
    }

    activeRooms[roomId].users[socket.id] = { ...user, socketId: socket.id };
    console.log(`User ${user.name || user.email} joined active tracking for room ${roomId}`);
    
    io.to(roomId).emit('update_users', Object.values(activeRooms[roomId].users));
  });

  socket.on('update_location', ({ roomId, lat, lng }) => {
    if (activeRooms[roomId] && activeRooms[roomId].users[socket.id]) {
      activeRooms[roomId].users[socket.id].lat = lat;
      activeRooms[roomId].users[socket.id].lng = lng;
      
      io.to(roomId).emit('update_users', Object.values(activeRooms[roomId].users));
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    for (const roomId in activeRooms) {
      if (activeRooms[roomId].users && activeRooms[roomId].users[socket.id]) {
        delete activeRooms[roomId].users[socket.id];
        io.to(roomId).emit('update_users', Object.values(activeRooms[roomId].users));
        break;
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
