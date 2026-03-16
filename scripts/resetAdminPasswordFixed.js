#!/usr/bin/env node

/**
 * Fixed Admin Password Reset
 * Usage: node scripts/resetAdminPasswordFixed.js
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
  console.log('🔧 Admin Password Reset Tool (Fixed Version)\n');
  
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

    const email = await prompt('Enter admin email: ');
    
    // Find the user
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      console.log('\n❌ User not found with email:', email);
      process.exit(1);
    }

    console.log(`\n📋 User found: ${user.name} (${user.role})`);
    console.log(`📦 Old password hash: ${user.password ? user.password.substring(0, 30) + '...' : 'MISSING'}`);
    
    const newPassword = await prompt('\nEnter new password (min 6 chars): ');
    
    if (newPassword.length < 6) {
      console.log('\n❌ Password must be at least 6 characters');
      process.exit(1);
    }

    // Method 1: Use the model's pre-save hook
    console.log('\n🔄 Method 1: Using model pre-save hook...');
    user.password = newPassword;
    await user.save();
    console.log('✅ Password saved using pre-save hook');

    // Verify the password
    console.log('\n🔄 Verifying password...');
    const verifiedUser = await User.findOne({ email }).select('+password');
    
    // Test the password using the model method
    const isMatch = await verifiedUser.matchPassword(newPassword);
    
    if (isMatch) {
      console.log('✅ Password verification successful via model method!');
      
      // Test with direct bcrypt compare
      const directMatch = await bcrypt.compare(newPassword, verifiedUser.password);
      console.log(`✅ Direct bcrypt compare: ${directMatch ? 'successful' : 'failed'}`);
      
      console.log('\n🎉 Password reset successful!');
      console.log('┌─────────────────────────────────┐');
      console.log(`│ Email:    ${email.padEnd(25)}│`);
      console.log(`│ Password: ${newPassword.padEnd(25)}│`);
      console.log('└─────────────────────────────────┘');
    } else {
      console.log('❌ Model method verification failed');
      
      // Method 2: Direct hash and update
      console.log('\n🔄 Method 2: Direct bcrypt hash...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      
      await User.updateOne(
        { _id: user._id },
        { $set: { password: hashedPassword } }
      );
      console.log('✅ Password updated via direct update');
      
      // Verify again
      const finalUser = await User.findOne({ email }).select('+password');
      const finalMatch = await bcrypt.compare(newPassword, finalUser.password);
      
      if (finalMatch) {
        console.log('✅ Direct verification successful!');
        console.log('\n🎉 Password reset successful!');
        console.log('┌─────────────────────────────────┐');
        console.log(`│ Email:    ${email.padEnd(25)}│`);
        console.log(`│ Password: ${newPassword.padEnd(25)}│`);
        console.log('└─────────────────────────────────┘');
      } else {
        console.log('❌ Both methods failed. There might be an issue with the database schema.');
      }
    }

  } catch (err) {
    console.error('\n❌ Error:', err);
  } finally {
    readline.close();
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
};

resetPassword();