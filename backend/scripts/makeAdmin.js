// Run: node scripts/makeAdmin.js <email_or_phone>
// Example: node scripts/makeAdmin.js admin@kafal.com
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const identifier = process.argv[2];
if (!identifier) {
  console.error('Usage: node scripts/makeAdmin.js <email_or_phone>');
  process.exit(1);
}

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const isEmail = identifier.includes('@');
  const query = isEmail ? { email: identifier.toLowerCase() } : { phone: identifier };

  const user = await User.findOne(query);
  if (!user) {
    console.error(`❌ No user found for: ${identifier}`);
    console.error('   The user must have logged in at least once before being promoted.');
    process.exit(1);
  }

  user.role = 'admin';
  await user.save();
  console.log(`✅ ${user.name || identifier} is now an Admin.`);
  await mongoose.disconnect();
};

run().catch(err => { console.error(err); process.exit(1); });
