require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@pulse.app';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Pulse Admin';

async function seedAdmin() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  let user = await User.findOne({ email: ADMIN_EMAIL });
  if (user) {
    user.role = 'admin';
    user.isActive = true;
    user.bannedAt = null;
    if (process.env.ADMIN_PASSWORD) {
      user.password = process.env.ADMIN_PASSWORD;
    }
    await user.save();
    console.log(`Updated existing user to admin: ${ADMIN_EMAIL}`);
  } else {
    user = await User.create({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role: 'admin'
    });
    console.log(`Created admin user: ${ADMIN_EMAIL}`);
  }

  console.log('Login with:');
  console.log(`  email:    ${ADMIN_EMAIL}`);
  console.log(`  password: ${process.env.ADMIN_PASSWORD || ADMIN_PASSWORD}`);
  await mongoose.disconnect();
}

seedAdmin().catch((err) => {
  console.error(err);
  process.exit(1);
});
