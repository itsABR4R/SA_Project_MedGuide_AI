import mongoose from 'mongoose';
import { AppError } from '../utils/app-error.mjs';

mongoose.set('bufferCommands', false);

export async function connectDatabase(databaseConfig) {
  if (!databaseConfig.uri) {
    throw new AppError(500, 'MONGODB_NOT_CONFIGURED', 'Add MONGODB_URI to the .env file before starting the app.');
  }

  const connection = mongoose.createConnection(databaseConfig.uri, {
    autoIndex: databaseConfig.autoIndex,
    serverSelectionTimeoutMS: databaseConfig.serverSelectionTimeoutMs,
    maxPoolSize: databaseConfig.maxPoolSize
  });

  connection.on('error', (error) => {
    console.error('MongoDB connection error.', { name: error.name, code: error.code });
  });
  connection.on('disconnected', () => {
    console.warn('MongoDB disconnected.');
  });

  await connection.asPromise();
  return connection;
}

export function databaseStatus(connection) {
  const names = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return names[connection?.readyState] || 'unknown';
}
