#!/usr/bin/env node

/**
 * Backup database to JSON files
 * Usage: npm run backup
 */

// DNS fix for Windows
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1']);

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const backup = async () => {
  console.log('💾 Database Backup\n');
  
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

    // Create backup directory
    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
      console.log('📁 Created backups directory');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `backup-${timestamp}`);
    fs.mkdirSync(backupPath);
    console.log(`📁 Created backup folder: backup-${timestamp}\n`);

    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    let totalDocs = 0;
    for (const { name } of collections) {
      const collection = mongoose.connection.db.collection(name);
      const count = await collection.countDocuments();
      const data = await collection.find({}).toArray();
      
      fs.writeFileSync(
        path.join(backupPath, `${name}.json`),
        JSON.stringify(data, null, 2)
      );
      
      console.log(`   ✅ ${name.padEnd(15)}: ${count} documents`);
      totalDocs += count;
    }

    console.log(`\n✅ Backup completed successfully!`);
    console.log(`   📊 Total documents: ${totalDocs}`);
    console.log(`   📁 Location: ${backupPath}`);
    
  } catch (err) {
    console.error('\n❌ Backup error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected');
    process.exit(0);
  }
};

backup();