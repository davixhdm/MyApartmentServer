#!/usr/bin/env node

/**
 * Drop all data except admin users
 * Usage: npm run drop-but-admin
 */

// DNS fix for Windows
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1']);

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const dropButAdmin = async () => {
  console.log('⚠️  This will delete ALL data EXCEPT admin users\n');
  
  if (process.argv[2] !== '--force') {
    console.log('   To confirm, run: npm run drop-but-admin -- --force');
    console.log('   Or: node scripts/dropButAdmin.js --force\n');
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

    // Find admin users to preserve
    const admins = await User.find({ role: 'admin' });
    console.log(`📊 Found ${admins.length} admin(s) to preserve\n`);

    // Get all collection names
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    console.log('📁 Dropping collections:');
    
    // Drop all collections except 'users'
    for (const name of collectionNames) {
      if (name !== 'users') {
        await mongoose.connection.db.dropCollection(name);
        console.log(`   ✅ Dropped: ${name}`);
      }
    }

    // Remove non-admin users
    const result = await User.deleteMany({ role: { $ne: 'admin' } });
    console.log(`\n✅ Removed ${result.deletedCount} non-admin users`);

    // Re-insert admins if needed (they're still there, we only deleted non-admins)
    console.log('\n✅ Database cleared except admin users');
    
    // Show remaining admins
    const remainingAdmins = await User.find({ role: 'admin' }).select('email');
    if (remainingAdmins.length > 0) {
      console.log('\n📋 Preserved admins:');
      remainingAdmins.forEach((admin, i) => {
        console.log(`   ${i+1}. ${admin.email}`);
      });
    }
    
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected');
    process.exit(0);
  }
};

dropButAdmin();