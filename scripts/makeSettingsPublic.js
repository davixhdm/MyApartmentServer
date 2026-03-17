#!/usr/bin/env node

/**
 * Make specific settings public for landing page
 * Usage: node scripts/makeSettingsPublic.js
 */

// DNS fix for Windows
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1']);

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Settings = require('../models/Settings');

const publicKeys = [
  'companyName',
  'paymentDueDay',
  'contactEmail',
  'contactPhone',
  'address',
  'website'
];

async function makePublic() {
  console.log('🔧 Making settings public...\n');

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

    let updated = 0;
    let created = 0;

    for (const key of publicKeys) {
      const existing = await Settings.findOne({ key });

      if (existing) {
        // Update existing setting to public
        if (!existing.public) {
          existing.public = true;
          await existing.save();
          console.log(`✅ Updated ${key} → public`);
          updated++;
        } else {
          console.log(`ℹ️  ${key} already public`);
        }
      } else {
        // Create default setting with public:true
        const defaultValue = getDefaultValue(key);
        await Settings.create({
          key,
          value: defaultValue,
          type: typeof defaultValue,
          public: true,
          group: getGroup(key),
          description: getDescription(key)
        });
        console.log(`✅ Created ${key} with default value and public`);
        created++;
      }
    }

    console.log(`\n📊 Summary: ${updated} updated, ${created} created`);
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

function getDefaultValue(key) {
  switch (key) {
    case 'companyName': return 'MyApartment';
    case 'paymentDueDay': return 5;
    case 'contactEmail': return 'info@myapartment.com';
    case 'contactPhone': return '+254 700 123 456';
    case 'address': return '123 Main Street, Nairobi, Kenya';
    case 'website': return 'https://myapartment.com';
    default: return '';
  }
}

function getGroup(key) {
  const groups = {
    companyName: 'company',
    paymentDueDay: 'payment',
    contactEmail: 'contact',
    contactPhone: 'contact',
    address: 'contact',
    website: 'company'
  };
  return groups[key] || 'general';
}

function getDescription(key) {
  const desc = {
    companyName: 'Company name displayed on the website',
    paymentDueDay: 'Day of month when rent is due (1-31)',
    contactEmail: 'Primary contact email',
    contactPhone: 'Primary contact phone number',
    address: 'Office address',
    website: 'Company website URL'
  };
  return desc[key] || '';
}

makePublic();