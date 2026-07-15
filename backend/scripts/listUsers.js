require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const users = await User.find().select('email phone name role profileComplete createdAt');
  console.log('\n── Users in Database ──────────────────────');
  users.forEach(u => console.log(`  ${u.role.padEnd(8)} | ${(u.email || u.phone || '?').padEnd(35)} | ${u.name || '(no name)'}`));
  console.log(`─────────────────────────────────────────\n`);
  await mongoose.disconnect();
};

run().catch(err => { console.error(err); process.exit(1); });
