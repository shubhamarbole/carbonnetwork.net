const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const connURI = process.env.MONGO_URI || 'mongodb://localhost:27017/esg-environmental';
    await mongoose.connect(connURI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('🟢 MongoDB SaaS Database connected successfully.');
  } catch (err) {
    console.error('🔴 MongoDB SaaS connection failure:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
