const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { pool, initDB } = require('../config/db');
const User = require('../models/User');

const seedAdmin = async () => {
  console.log('--- Relief Management System: Admin Seeding ---');
  try {
    // 1. Ensure tables exist
    await initDB();

    // 2. Read configuration from environment or defaults
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@relief.org').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';
    const adminName = 'System Administrator';

    console.log(`Checking if admin user exists with email: ${adminEmail}...`);
    const existingAdmin = await User.findByEmail(adminEmail);

    if (existingAdmin) {
      console.log(`Admin user already exists with email: ${adminEmail}`);
      console.log(`- ID: ${existingAdmin.id}, Name: ${existingAdmin.name}, Role: ${existingAdmin.role}`);
      return;
    }

    console.log('Admin user not found. Generating password hash...');
    // 3. Hash password with bcrypt
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(adminPassword, salt);

    // 4. Insert with role 'admin'
    console.log('Creating admin user record...');
    const newAdmin = await User.create({
      name: adminName,
      email: adminEmail,
      passwordHash,
      role: 'admin',
    });

    console.log('Admin user successfully created:');
    console.log(`- ID: ${newAdmin.id}`);
    console.log(`- Name: ${newAdmin.name}`);
    console.log(`- Email: ${newAdmin.email}`);
    console.log(`- Role: ${newAdmin.role}`);
  } catch (error) {
    console.error('Admin seeding failed:', error.message || error);
    process.exitCode = 1;
  } finally {
    // 5. Close connection
    console.log('Closing database connection pool...');
    await pool.end();
    console.log('Database connection pool closed.');
  }
};

seedAdmin();
