#!/usr/bin/env node

/**
 * Seed database with sample data (preserves admin users)
 * Usage: npm run seed
 */

// DNS fix for Windows
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1']);

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { faker } = require('@faker-js/faker');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Property = require('../models/Property');
const Transaction = require('../models/Transaction');
const Maintenance = require('../models/Maintenance');
const Application = require('../models/Application');

// Valid amenity values based on Property model
const VALID_AMENITIES = [
  'parking', 'gym', 'pool', 'security', 'elevator', 'furnished', 'wifi', 'ac'
];

// Helper function to generate a valid phone number (max 20 chars)
const generatePhoneNumber = () => {
  // Generate Kenyan phone number format: +254 7XX XXX XXX
  const prefix = '+254';
  const operator = faker.helpers.arrayElement(['7', '1']); // Safaricom, Airtel
  const number = faker.string.numeric(8); // 8 digits
  return `${prefix}${operator}${number}`; // This will be around 13-14 characters
};

const seed = async () => {
  console.log('🌱 Seeding database with sample data...\n');
  
  if (process.argv[2] !== '--force') {
    console.log('⚠️  This will overwrite existing data (except admins)');
    console.log('   To confirm, run: npm run seed -- --force\n');
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

    // 1. Preserve admin users
    const admins = await User.find({ role: 'admin' });
    console.log(`📊 Preserving ${admins.length} admin(s)`);

    // 2. Clear all collections except users
    const collections = await mongoose.connection.db.listCollections().toArray();
    for (const { name } of collections) {
      if (name !== 'users') {
        await mongoose.connection.db.dropCollection(name);
        console.log(`   ✅ Dropped: ${name}`);
      }
    }

    // 3. Remove non-admin users
    const deletedUsers = await User.deleteMany({ role: { $ne: 'admin' } });
    console.log(`\n✅ Removed ${deletedUsers.deletedCount} non-admin users\n`);

    console.log('📝 Creating sample data...\n');

    // 4. Create sample users with properly formatted phone numbers
    const password = await bcrypt.hash('password123', 10);

    // Create landlord
    const landlord = await User.create({
      name: faker.person.fullName(),
      email: faker.internet.email(),
      password,
      role: 'landlord',
      phone: generatePhoneNumber(),
      isActive: true
    });
    console.log(`   ✅ Landlord: ${landlord.name} (${landlord.email})`);

    // Create tenant
    const tenant = await User.create({
      name: faker.person.fullName(),
      email: faker.internet.email(),
      password,
      role: 'tenant',
      phone: generatePhoneNumber(),
      isActive: true
    });
    console.log(`   ✅ Tenant: ${tenant.name} (${tenant.email})`);

    // Create second tenant
    const tenant2 = await User.create({
      name: faker.person.fullName(),
      email: faker.internet.email(),
      password,
      role: 'tenant',
      phone: generatePhoneNumber(),
      isActive: true
    });
    console.log(`   ✅ Tenant: ${tenant2.name} (${tenant2.email})\n`);

    // 5. Create sample properties with valid amenities
    const property1 = await Property.create({
      title: 'Modern Apartment in Westlands',
      description: 'Beautiful 2-bedroom apartment with great views',
      price: 45000,
      address: {
        street: 'Westlands Road',
        city: 'Nairobi',
        state: 'Nairobi',
        zipCode: '00100',
        country: 'Kenya'
      },
      location: {
        type: 'Point',
        coordinates: [36.8123, -1.2678]
      },
      type: 'apartment',
      status: 'available',
      bedrooms: 2,
      bathrooms: 2,
      area: 85,
      amenities: ['parking', 'wifi', 'security', 'gym'],
      landlord: landlord._id,
      images: [{ 
        url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267', 
        isPrimary: true 
      }]
    });
    console.log(`   ✅ Property: ${property1.title}`);

    const property2 = await Property.create({
      title: 'Spacious House in Karen',
      description: '4-bedroom house with garden and pool',
      price: 120000,
      address: {
        street: 'Karen Road',
        city: 'Nairobi',
        state: 'Nairobi',
        zipCode: '00100',
        country: 'Kenya'
      },
      location: {
        type: 'Point',
        coordinates: [36.7123, -1.3678]
      },
      type: 'house',
      status: 'occupied',
      bedrooms: 4,
      bathrooms: 3,
      area: 250,
      amenities: ['parking', 'wifi', 'security', 'pool'],
      landlord: landlord._id,
      currentTenant: tenant._id,
      images: [{ 
        url: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994', 
        isPrimary: true 
      }]
    });
    console.log(`   ✅ Property: ${property2.title}`);

    const property3 = await Property.create({
      title: 'Cozy Studio in Kilimani',
      description: 'Modern studio apartment perfect for singles',
      price: 25000,
      address: {
        street: 'Kilimani Road',
        city: 'Nairobi',
        state: 'Nairobi',
        zipCode: '00100',
        country: 'Kenya'
      },
      location: {
        type: 'Point',
        coordinates: [36.7823, -1.2878]
      },
      type: 'apartment',
      status: 'available',
      bedrooms: 1,
      bathrooms: 1,
      area: 45,
      amenities: ['wifi', 'security', 'furnished'],
      landlord: landlord._id,
      images: [{ 
        url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688', 
        isPrimary: true 
      }]
    });
    console.log(`   ✅ Property: ${property3.title}\n`);

    // 6. Create transactions
    const transaction1 = await Transaction.create({
      transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      type: 'rent',
      amount: property2.price,
      currency: 'KES',
      status: 'completed',
      paymentMethod: 'mpesa',
      property: property2._id,
      tenant: tenant._id,
      landlord: landlord._id,
      dueDate: new Date(),
      paidDate: new Date(),
      description: `Rent payment for ${property2.title}`
    });
    console.log(`   ✅ Transaction: ${transaction1.transactionId}`);

    const transaction2 = await Transaction.create({
      transactionId: `TXN-${Date.now()+1}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      type: 'rent',
      amount: property1.price,
      currency: 'KES',
      status: 'pending',
      paymentMethod: 'bank_transfer',
      property: property1._id,
      tenant: tenant2._id,
      landlord: landlord._id,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      description: `Rent payment for ${property1.title}`
    });
    console.log(`   ✅ Transaction: ${transaction2.transactionId}\n`);

    // 7. Create maintenance requests
    const maintenance1 = await Maintenance.create({
      requestId: `MNT-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      title: 'Leaking Kitchen Faucet',
      description: 'The kitchen sink faucet is leaking continuously',
      category: 'plumbing',
      priority: 'medium',
      status: 'pending',
      property: property2._id,
      tenant: tenant._id
    });
    console.log(`   ✅ Maintenance: ${maintenance1.title}`);

    const maintenance2 = await Maintenance.create({
      requestId: `MNT-${Date.now()+1}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      title: 'Broken Light in Living Room',
      description: 'The main light in the living room is not working',
      category: 'electrical',
      priority: 'low',
      status: 'approved',
      property: property2._id,
      tenant: tenant._id
    });
    console.log(`   ✅ Maintenance: ${maintenance2.title}\n`);

    // 8. Create applications with properly formatted phone numbers
    const application1 = await Application.create({
      applicationId: `APP-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      property: property1._id,
      applicant: tenant2._id,
      status: 'pending',
      personalInfo: {
        fullName: tenant2.name,
        email: tenant2.email,
        phone: tenant2.phone,
        currentAddress: faker.location.streetAddress(),
        employmentStatus: 'employed',
        employer: faker.company.name(),
        monthlyIncome: 85000
      },
      emergencyContact: {
        name: faker.person.fullName(),
        relationship: 'Spouse',
        phone: generatePhoneNumber()
      }
    });
    console.log(`   ✅ Application: ${application1.applicationId}`);

    const application2 = await Application.create({
      applicationId: `APP-${Date.now()+1}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      property: property3._id,
      applicant: tenant._id,
      status: 'approved',
      personalInfo: {
        fullName: tenant.name,
        email: tenant.email,
        phone: tenant.phone,
        currentAddress: faker.location.streetAddress(),
        employmentStatus: 'employed',
        employer: faker.company.name(),
        monthlyIncome: 120000
      },
      emergencyContact: {
        name: faker.person.fullName(),
        relationship: 'Brother',
        phone: generatePhoneNumber()
      }
    });
    console.log(`   ✅ Application: ${application2.applicationId}\n`);

    console.log('✅ Database seeded successfully!\n');
    console.log('📋 Sample Login Credentials:');
    console.log('┌─────────────────────────────────────────────────┐');
    console.log(`│ Landlord: ${landlord.email.padEnd(41)}│`);
    console.log(`│ Tenant 1: ${tenant.email.padEnd(41)}│`);
    console.log(`│ Tenant 2: ${tenant2.email.padEnd(41)}│`);
    console.log(`│ Password: password123${' '.repeat(32)}│`);
    console.log('└─────────────────────────────────────────────────┘\n');
    
    console.log('📊 Summary:');
    console.log(`   • Users: 3 (1 landlord, 2 tenants)`);
    console.log(`   • Properties: 3`);
    console.log(`   • Transactions: 2`);
    console.log(`   • Maintenance: 2`);
    console.log(`   • Applications: 2\n`);

  } catch (err) {
    console.error('\n❌ Seeding error:', err.message);
    if (err.errors) {
      console.error('\nValidation Errors:');
      Object.keys(err.errors).forEach(key => {
        console.error(`   ${key}: ${err.errors[key].message}`);
      });
    }
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
};

seed();