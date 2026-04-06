import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongod;

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;

    if (mongoURI && mongoURI.trim() !== '') {
      // Use external MongoDB (Atlas or local install)
      await mongoose.connect(mongoURI);
      console.log('✅ MongoDB connected (external)');
    } else {
      // Use embedded MongoDB Memory Server (ephemeral but zero-setup)
      console.log('⏳ Starting embedded MongoDB (first run downloads binary ~100MB)...');
      mongod = await MongoMemoryServer.create();

      const uri = mongod.getUri();
      await mongoose.connect(uri);
      console.log('✅ MongoDB connected (embedded in-memory)');
      console.log('⚠️  Data resets on server restart. Set MONGODB_URI in .env for persistence.');
    }
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

export const closeDB = async () => {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
};

export default connectDB;
