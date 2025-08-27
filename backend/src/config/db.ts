import mongoose from 'mongoose';
import { ENV } from './env.js';

export async function connectDB() {
  try {
    if (!ENV.MONGO_URI) {
      throw new Error('MONGO_URI is not set in environment');
    }

    console.log('Connecting to MongoDB...');
    // Set a short server selection timeout so deploys fail fast if DB is unreachable
    await mongoose.connect(ENV.MONGO_URI, { serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000 });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', (err as any)?.message ?? err);
    // rethrow so caller can decide how to handle (server startup will exit)
    throw err;
  }
}
