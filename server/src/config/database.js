import mongoose from 'mongoose';
import { logger as defaultLogger } from './logger.js';

mongoose.set('bufferCommands', false);
mongoose.set('strictQuery', true);
mongoose.set('sanitizeFilter', true);

export async function connectDatabase(databaseConfig, { logger = defaultLogger } = {}) {
  const connection = mongoose.createConnection(databaseConfig.uri, {
    autoIndex: databaseConfig.autoIndex,
    serverSelectionTimeoutMS: databaseConfig.serverSelectionTimeoutMs,
    socketTimeoutMS: databaseConfig.socketTimeoutMs,
    minPoolSize: databaseConfig.minPoolSize,
    maxPoolSize: databaseConfig.maxPoolSize
  });

  connection.on('error', (error) => {
    logger.error('MongoDB connection error.', { error });
  });
  connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected.');
  });

  await connection.asPromise();
  logger.info('MongoDB connected.', { database: connection.name });
  return connection;
}

export function databaseStatus(connection) {
  const names = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return names[connection?.readyState] || 'unknown';
}
