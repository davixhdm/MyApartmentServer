#!/usr/bin/env node

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

// Force IPv4 and set DNS servers
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1']); // Use Google/Cloudflare DNS

const checkAdmin = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    console.log('📡 Using DNS: 8.8.8.8, 1.1.1.1\n');

    // Add connection options
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4 // Force IPv4
    };

    await mongoose.connect(process.env.MONGODB_URI, options);
    console.log('✅ Connected to MongoDB\n');

    const count = await User.countDocuments({ role: 'admin' });
    console.log(`📊 Admin count: ${count}`);

    if (count === 0) {
      console.log('\n⚠️  No admin users found.');
      console.log('   Run `npm run create-admin` to create one.\n');
    } else {
      const admins = await User.find({ role: 'admin' }).select('name email');
      console.log('\n📋 Admin Users:');
      admins.forEach((admin, index) => {
        console.log(`   ${index + 1}. ${admin.name} - ${admin.email}`);
      });
      console.log('');
    }

    process.exit(count === 0 ? 1 : 0);
    
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    
    if (err.message.includes('querySrv')) {
      console.log('\n💡 Troubleshooting Tips:');
      console.log('   1️⃣ Check your internet connection');
      console.log('   2️⃣ Verify MongoDB URI in .env file:');
      console.log(`      ${process.env.MONGODB_URI?.substring(0, 50)}...`);
      console.log('   3️⃣ Whitelist your IP in MongoDB Atlas:');
      console.log('      • Go to https://cloud.mongodb.com');
      console.log('      • Click "Network Access"');
      console.log('      • Add IP 0.0.0.0/0 (for testing)');
      console.log('   4️⃣ Try pinging the cluster:');
      console.log('      ping cluster0.i5j7cns.mongodb.net');
      console.log('   5️⃣ Disable VPN/firewall temporarily\n');
    }
    
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

checkAdmin();