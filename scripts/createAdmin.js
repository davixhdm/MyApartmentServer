#!/usr/bin/env node

/**
 * Create admin user interactively
 * Usage: npm run create-admin
 */

// DNS fix for Windows
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1']);

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

const prompt = (query) => new Promise(resolve => readline.question(query, resolve));

const createAdmin = async () => {
  console.log('📝 Create Admin User\n');
  
  try {
    console.log('🔄 Connecting to MongoDB...');
    
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      family: 4
    };

    await mongoose.connect(process.env.MONGODB_URI, options);
    console.log('✅ Connected to MongoDB\n');

    // Get user input
    const name = await prompt('Enter admin name: ');
    const email = await prompt('Enter admin email: ');
    const password = await prompt('Enter admin password: ');
    const confirmPassword = await prompt('Confirm password: ');

    // Validate inputs
    if (!name || !email || !password) {
      throw new Error('All fields are required');
    }

    if (password !== confirmPassword) {
      throw new Error('Passwords do not match');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    // Check if user exists
    const existing = await User.findOne({ email });
    if (existing) {
      throw new Error('User with that email already exists');
    }

    // Create admin
    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'admin',
      isActive: true
    });
    
    await admin.save();

    console.log('\n✅ Admin user created successfully!');
    console.log('┌─────────────────────────────┐');
    console.log(`│ Name:  ${name.padEnd(25)}│`);
    console.log(`│ Email: ${email.padEnd(25)}│`);
    console.log(`│ Role:  admin                │`);
    console.log('└─────────────────────────────┘\n');
    
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  } finally {
    readline.close();
    await mongoose.disconnect();
    console.log('👋 Disconnected');
    process.exit(0);
  }
};

createAdmin();