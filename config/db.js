const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, // Increased timeout
      socketTimeoutMS: 45000,
      maxPoolSize: 10, // Maintain up to 10 socket connections
      minPoolSize: 2,   // Keep at least 2 connections open
    });

    console.log('✅ MongoDB Connected'.cyan.underline.bold);

    mongoose.connection.on('error', (err) => {
      console.error(`❌ MongoDB connection error: ${err}`.red);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected. Attempting to reconnect...'.yellow);
      setTimeout(connectDB, 5000); // Try to reconnect after 5 seconds
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected'.green);
    });

  } catch (error) {
    console.error(`❌ Error: ${error.message}`.red.underline.bold);
    console.log('Retrying connection in 5 seconds...'.yellow);
    setTimeout(connectDB, 5000); // Retry connection
  }
};

module.exports = connectDB;