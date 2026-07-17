require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const User = require('../models/User');

const DB_URI = process.env.MONGO_URI || 'YOUR_MONGO_URI_HERE';

async function manageUsers() {
  try {
    await mongoose.connect(DB_URI);
    console.log('✅ Connected to MongoDB\n');

    // List all users
    console.log('--- ALL USERS ---');
    const users = await User.find({}, 'name email role designation');
    users.forEach(u => {
      console.log(`- ${u.name} | ${u.email} | Role: ${u.role} | Designation: ${u.designation}`);
    });

    // To update a user to admin, uncomment the following code and replace the email:
    /*
    const targetEmail = 'employee@example.com';
    await User.findOneAndUpdate({ email: targetEmail }, { role: 'admin' });
    console.log(`\n✅ Updated ${targetEmail} to Admin.`);
    */

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

manageUsers();
