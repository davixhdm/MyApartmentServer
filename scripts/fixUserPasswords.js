#!/usr/bin/env node

/**
 * Fix user passwords - rehash them if they're invalid
 * Usage: node scripts/fixUserPasswords.js
 */

// DNS fix for Windows
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1']);

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const fixPasswords = async () => {
  console.log('🔧 Password Fix Tool\n');
  
  if (process.argv[2] !== '--force') {
    console.log('⚠️  This will reset ALL user passwords to "password123"');
    console.log('   To confirm, run: node scripts/fixUserPasswords.js --force\n');
    process.exit(0);
  }

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

    // Find all users
    const users = await User.find({}).select('+password');
    console.log(`📊 Found ${users.length} users\n`);

    let fixed = 0;
    for (const user of users) {
      console.log(`Checking: ${user.email} (${user.role})`);
      
      // Check if password is valid
      const needsFix = !user.password || !user.password.startsWith('$2a$');
      
      if (needsFix) {
        console.log(`   ⚠️  Invalid password hash, resetting to 'password123'`);
        
        // Set default password
        user.password = 'password123';
        await user.save();
        console.log(`   ✅ Password reset for ${user.email}`);
        fixed++;
      } else {
        console.log(`   ✅ Password hash valid`);
      }
    }

    console.log(`\n✅ Password check completed: ${fixed} users fixed`);

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

fixPasswords();