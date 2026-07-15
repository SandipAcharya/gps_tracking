require('dotenv').config();
const mongoose = require('mongoose');

const connectAndClear = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB Atlas');
  await mongoose.connection.db.collection('rooms').drop().catch(() => console.log('No rooms collection found'));
  await mongoose.connection.db.collection('users').drop().catch(() => console.log('No users collection found'));
  console.log('✅ All rooms and users cleared from Atlas database.');
  await mongoose.disconnect();
  process.exit(0);
};

connectAndClear();
