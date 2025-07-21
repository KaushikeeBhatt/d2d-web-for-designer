import { MongoClient } from 'mongodb';
import mongoose from 'mongoose';

// Throw if MONGODB_URI is not set
if (!process.env.MONGODB_URI) {
  throw new Error('Please add your MongoDB URI to .env.local');
}

const uri = process.env.MONGODB_URI;
const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

let client;
let clientPromise;

// Use a global variable to preserve the MongoClient across hot reloads in development
if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// Mongoose connection for models
let isConnected = false;

/**
 * Connect to MongoDB using Mongoose.
 * Ensures a single connection is used across the app.
 * Logs connection status and errors.
 */
export async function connectDB() {
  if (isConnected) {
    return;
  }

  try {
    await mongoose.connect(uri, {
      dbName: process.env.DATABASE_NAME || 'd2d-designer',
      ...options
    });
    isConnected = true;
    console.log('[MongoDB] Connected successfully');
  } catch (error) {
    console.error('[MongoDB] Connection error:', error);
    throw error;
  }
}

// Export both for different use cases
export default clientPromise; // For NextAuth adapter
export { connectDB }; // For API routes using Mongoose
