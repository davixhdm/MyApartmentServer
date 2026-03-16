#!/usr/bin/env node

/**
 * Reset admin password
 * Usage: node scripts/resetAdminPassword.js
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

const resetPassword = async () => {
  console.log('🔧 Admin Password Reset Tool\n');
  
  try {
    console.log('🔄 Connecting to MongoDB...');
    console.log(`📡 Using MongoDB URI: ${process.env.MONGODB_URI?.substring(0, 50)}...\n`);

    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4 // Force IPv4
    };

    await mongoose.connect(process.env.MONGODB_URI, options);
    console.log('✅ Connected to MongoDB\n');

    const email = await prompt('Enter admin email: ');
    
    // Find the user
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      console.log('\n❌ User not found with email:', email);
      console.log('\n💡 Available emails:');
      const allUsers = await User.find({}).select('email role');
      allUsers.forEach(u => console.log(`   - ${u.email} (${u.role})`));
      process.exit(1);
    }

    console.log(`\n📋 User found: ${user.name} (${user.role})`);
    console.log(`📦 Current password hash: ${user.password ? user.password.substring(0, 30) + '...' : 'MISSING'}`);
    
    const newPassword = await prompt('\nEnter new password (min 6 chars): ');
    
    if (newPassword.length < 6) {
      console.log('\n❌ Password must be at least 6 characters');
      process.exit(1);
    }

    // Hash the new password directly
    console.log('\n🔄 Hashing new password...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update password directly
    user.password = hashedPassword;
    await user.save();

    console.log('✅ Password reset successfully!');
    console.log(`   Email: ${email}`);
    console.log(`   New Password: ${newPassword}`);
    
    // Verify the password works
    console.log('\n🔄 Verifying new password...');
    const verifyUser = await User.findOne({ email }).select('+password');
    const isMatch = await bcrypt.compare(newPassword, verifyUser.password);
    
    if (isMatch) {
      console.log('✅ Password verification successful!');
      console.log('\n🎉 You can now login with:');
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${newPassword}`);
    } else {
      console.log('❌ Password verification failed! Please try again.');
    }

  } catch (err) {
    console.error('\n❌ Error:', err.message);
    
    if (err.message.includes('querySrv') || err.message.includes('getaddrinfo')) {
      console.log('\n💡 Network Troubleshooting:');
      console.log('   1. Check your internet connection');
      console.log('   2. Verify MongoDB URI in .env');
      console.log('   3. Whitelist your IP in MongoDB Atlas');
      console.log('   4. Try pinging: ping cluster0.i5j7cns.mongodb.net');
    }
  } finally {
    readline.close();
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
};

resetPassword();