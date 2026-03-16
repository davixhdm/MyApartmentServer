#!/usr/bin/env node

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const dns = require('dns');

console.log('🔍 Testing MongoDB Connection...\n');

// Test DNS resolution first
dns.resolve4('cluster0.i5j7cns.mongodb.net', (err, addresses) => {
  if (err) {
    console.error('❌ DNS Resolution Failed:', err.message);
    console.log('\n💡 This usually means:');
    console.log('   1. No internet connection');
    console.log('   2. MongoDB Atlas cluster is down');
    console.log('   3. Firewall blocking DNS');
    console.log('   4. VPN/proxy issues\n');
  } else {
    console.log('✅ DNS Resolution Successful:', addresses);
  }

  // Now test MongoDB connection
  testMongoDB();
});

const testMongoDB = async () => {
  try {
    console.log('\n🔄 Connecting to MongoDB Atlas...');
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log('✅ MongoDB Connection Successful!');
    console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);
    
    await mongoose.disconnect();
    console.log('👋 Disconnected');
    
  } catch (error) {
    console.error('\n❌ MongoDB Connection Failed:', error.message);
    
    if (error.message.includes('querySrv')) {
      console.log('\n💡 Solutions:');
      console.log('   1. Check your internet connection');
      console.log('   2. Verify MONGODB_URI in .env file');
      console.log('   3. Whitelist your IP in MongoDB Atlas');
      console.log('   4. Try pinging cluster0.i5j7cns.mongodb.net');
      console.log('   5. Disable VPN/proxy if using one\n');
    }
  }
  
  process.exit(0);
};