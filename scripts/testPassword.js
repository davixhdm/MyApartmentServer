#!/usr/bin/env node

/**
 * Test password directly with bcrypt
 * Usage: node scripts/testPassword.js
 */

// DNS fix for Windows
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1']);

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const testPassword = async () => {
  console.log('🔍 Password Tester\n');
  
  try {
    console.log('🔄 Connecting to MongoDB...');
    console.log(`📡 URI: ${process.env.MONGODB_URI?.substring(0, 50)}...\n`);

    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      family: 4
    };

    await mongoose.connect(process.env.MONGODB_URI, options);
    console.log('✅ Connected to MongoDB\n');

    const email = 'hdm@gmail.com';
    const testPasswords = [
      'password123',
      'admin123',
      'hdm@gmail.com',
      '123456',
      'Password123',
      'admin',
      'password'
    ];
    
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      console.log('❌ User not found with email:', email);
      
      // Show all users
      console.log('\n📋 Available users:');
      const allUsers = await User.find({}).select('email role');
      allUsers.forEach(u => console.log(`   - ${u.email} (${u.role})`));
      process.exit(1);
    }

    console.log(`📋 User: ${user.name} (${user.role})`);
    console.log(`📦 Stored password hash: ${user.password ? user.password.substring(0, 30) + '...' : 'MISSING'}`);
    console.log(`🔑 Hash format valid: ${user.password?.startsWith('$2a$') ? '✅' : '❌'}\n`);

    if (!user.password) {
      console.log('❌ No password hash found in database!');
      console.log('\n💡 Run: node scripts/resetAdminPassword.js to set a new password');
      process.exit(1);
    }

    console.log('🔍 Testing common passwords:\n');
    console.log('┌─────────────────┬─────────┐');
    console.log('│ Password        │ Result  │');
    console.log('├─────────────────┼─────────┤');
    
    let foundMatch = false;
    for (const pw of testPasswords) {
      try {
        const isMatch = await bcrypt.compare(pw, user.password);
        const result = isMatch ? '✅ MATCH' : '❌ no';
        console.log(`│ ${pw.padEnd(15)} │ ${result.padEnd(7)} │`);
        if (isMatch) foundMatch = true;
      } catch (err) {
        console.log(`│ ${pw.padEnd(15)} │ ❌ error │`);
      }
    }
    console.log('└─────────────────┴─────────┘\n');

    if (!foundMatch) {
      console.log('❌ No matching password found!');
      console.log('\n💡 Options:');
      console.log('   1. Run: node scripts/resetAdminPassword.js');
      console.log('   2. Create new admin: node scripts/createAdmin.js');
      console.log('   3. Check if password was properly hashed during creation\n');
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    
    if (err.message.includes('querySrv')) {
      console.log('\n💡 DNS/Network Issue:');
      console.log('   1. Check internet connection');
      console.log('   2. Verify MongoDB URI');
      console.log('   3. Whitelist IP in MongoDB Atlas');
    }
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected');
    process.exit(0);
  }
};

testPassword();