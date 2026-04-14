// src/db/connection.js
// Establishes a Mongoose connection using MONGODB_URI from environment.
// Called once from server.js before routes are loaded.

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/drivepro';

// Mongoose 8 no longer needs useNewUrlParser / useUnifiedTopology
const options = {
  // How long the driver waits before failing a connection attempt (ms)
  serverSelectionTimeoutMS: 10000,
  // How long an individual operation can stay in the queue waiting for a
  // connection before timing out (ms)
  socketTimeoutMS: 45000,
};

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI, options);
    console.log(`MongoDB connected → ${mongoose.connection.host}/${mongoose.connection.name}`);
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    // Exit the process so Render/PM2 restarts it rather than serving with no DB
    process.exit(1);
  }
}

// ── Connection lifecycle events ───────────────────────────────────────────────
mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected — waiting for reconnect...');
});
mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected');
});
mongoose.connection.on('error', (err) => {
  console.error('MongoDB runtime error:', err.message);
});

module.exports = connectDB;
