import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './src/server.mjs';

export { createApp } from './src/app.mjs';
export { startServer } from './src/server.mjs';

const currentFile = fileURLToPath(import.meta.url);

function isMongoConnectionError(error) {
  return error?.name === 'MongooseServerSelectionError'
    || error?.code === 'ECONNREFUSED'
    || /connect ECONNREFUSED|server selection/i.test(String(error?.message || ''));
}

if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  try {
    await startServer();
  } catch (error) {
    if (error.code === 'EADDRINUSE') {
      console.error('The configured port is already in use. Stop the existing server or choose another PORT.');
    } else if (error.code === 'MONGODB_NOT_CONFIGURED') {
      console.error(error.message);
    } else if (isMongoConnectionError(error)) {
      console.error('Cannot connect to the local MongoDB service at 127.0.0.1:27017.');
      console.error('Start it with: sudo systemctl start mongod');
      console.error('Then verify it with: npm run db:check');
    } else {
      console.error('Server startup failed.', { name: error.name, code: error.code, message: error.message });
    }
    process.exitCode = 1;
  }
}
