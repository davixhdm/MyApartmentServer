#!/usr/bin/env node

/**
 * Drop entire database
 * Usage: npm run drop-db
 */

// DNS fix for Windows
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1']);

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const dropDB = async () => {
  console.log('⚠️  WARNING: This will DELETE the entire database!\n');
  
  // Simple confirmation
  if (process.argv[2] !== '--force') {
    console.log('   To confirm, run: npm run drop-db -- --force');
    console.log('   Or: node scripts/dropDB.js --force\n');
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
    console.log('✅ Connected to MongoDB');

    const dbName = mongoose.connection.db.databaseName;
    console.log(`📊 Database: ${dbName}`);

    await mongoose.connection.db.dropDatabase();
    console.log('✅ Database dropped successfully');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected');
    process.exit(0);
  }
};

dropDB();