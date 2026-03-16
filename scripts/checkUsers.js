#!/usr/bin/env node

/**
 * Check all users and their password status
 * Usage: node scripts/checkUsers.js
 */

// DNS fix for Windows
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1']);

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const checkUsers = async () => {
  console.log('📋 User Database Check\n');
  
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

    const users = await User.find({}).select('+password');
    
    console.log(`📊 Total Users: ${users.length}\n`);
    console.log('┌────┬──────────────────────────────────┬────────────┬────────┬─────────────┐');
    console.log('│ #  │ Email                            │ Role       │ Active │ Password    │');
    console.log('├────┼──────────────────────────────────┼────────────┼────────┼─────────────┤');
    
    users.forEach((user, index) => {
      const num = (index + 1).toString().padStart(2);
      const email = user.email.padEnd(32);
      const role = user.role.padEnd(10);
      const active = user.isActive ? '✅' : '❌';
      
      let passwordStatus = '❌ MISSING';
      if (user.password) {
        passwordStatus = user.password.startsWith('$2a$') ? '✅ Valid' : '⚠️ Invalid';
      }
      
      console.log(`│ ${num} │ ${email} │ ${role} │   ${active}   │ ${passwordStatus.padEnd(11)} │`);
    });
    
    console.log('└────┴──────────────────────────────────┴────────────┴────────┴─────────────┘\n');

    // Summary
    const total = users.length;
    const withPassword = users.filter(u => u.password).length;
    const validHash = users.filter(u => u.password?.startsWith('$2a$')).length;
    const admins = users.filter(u => u.role === 'admin').length;
    
    console.log('📈 Summary:');
    console.log(`   • Total users: ${total}`);
    console.log(`   • Has password: ${withPassword}/${total}`);
    console.log(`   • Valid hash: ${validHash}/${total}`);
    console.log(`   • Admins: ${admins}`);
    
    if (admins === 0) {
      console.log('\n⚠️  No admin users found!');
      console.log('   Run: node scripts/createAdmin.js');
    }

  } catch (err) {
    console.error('\n❌ Error:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected');
    process.exit(0);
  }
};

checkUsers();