#!/usr/bin/env node

/**
 * Direct database update for admin password
 * Uses MongoDB native driver to bypass Mongoose hooks
 * Usage: node scripts/directUpdate.js
 */

const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1']);

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

const prompt = (query) => new Promise(resolve => readline.question(query, resolve));

const directUpdate = async () => {
  console.log('🔧 Direct Database Admin Password Update\n');
  
  let client;
  try {
    console.log('🔄 Connecting to MongoDB directly...');
    
    client = new MongoClient(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000
    });
    
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db();
    const usersCollection = db.collection('users');
    
    const email = await prompt('Enter admin email: ');
    
    // Find the user
    const user = await usersCollection.findOne({ email });
    
    if (!user) {
      console.log('\n❌ User not found with email:', email);
      
      // List all users
      const allUsers = await usersCollection.find({}).toArray();
      console.log('\n📋 Available users:');
      allUsers.forEach(u => console.log(`   - ${u.email} (${u.role})`));
      process.exit(1);
    }

    console.log(`\n📋 User found: ${user.name} (${user.role})`);
    
    const newPassword = await prompt('Enter new password (min 6 chars): ');
    
    if (newPassword.length < 6) {
      console.log('\n❌ Password must be at least 6 characters');
      process.exit(1);
    }

    // Hash the password
    console.log('\n🔄 Hashing password...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update directly in MongoDB
    const result = await usersCollection.updateOne(
      { _id: user._id },
      { $set: { password: hashedPassword } }
    );
    
    if (result.modifiedCount === 1) {
      console.log('✅ Password updated successfully in database!');
      
      // Verify the update
      const updatedUser = await usersCollection.findOne({ _id: user._id });
      const verifyMatch = await bcrypt.compare(newPassword, updatedUser.password);
      
      if (verifyMatch) {
        console.log('✅ Password verification successful!');
        console.log('\n🎉 You can now login with:');
        console.log(`   Email: ${email}`);
        console.log(`   Password: ${newPassword}`);
      } else {
        console.log('❌ Password verification failed!');
      }
    } else {
      console.log('❌ Failed to update password');
    }

  } catch (err) {
    console.error('\n❌ Error:', err);
  } finally {
    readline.close();
    if (client) await client.close();
    console.log('\n👋 Disconnected');
    process.exit(0);
  }
};

directUpdate();