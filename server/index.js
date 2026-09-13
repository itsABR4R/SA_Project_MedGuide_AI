import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './src/config/env.js';
import { createLogger } from './src/config/logger.js';
import { startServer } from './src/server.js';

export { createApp } from './src/app.js';
export { startServer } from './src/server.js';

const currentFile = fileURLToPath(import.meta.url);

function isMongoConnectionError(error) {
  return (
    error?.name === 'MongooseServerSelectionError' ||
    error?.code === 'ECONNREFUSED' ||
    /connect ECONNREFUSED|server selection/i.test(String(error?.message || ''))
  );
}

function logStartupFailure(error, logger) {
  if (error.code === 'EADDRINUSE') {
    logger.error('The configured port is already in use. Stop the existing server or choose another PORT.');
  } else if (error.code === 'INVALID_CONFIGURATION') {
    logger.error('Application configuration is invalid.', { error });
  } else if (isMongoConnectionError(error)) {
    logger.error('Cannot connect to MongoDB. Start the local service, then run npm run db:check.', { error });
  } else {
    logger.error('Server startup failed.', { error });
  }
}

function installProcessHandlers(runtime) {
  let terminationStarted = false;
  const terminate = async (reason, error) => {
    if (terminationStarted) return;
    terminationStarted = true;
    if (error) runtime.logger.error('Fatal process error.', { reason, error });
    try {
      await runtime.shutdown(reason);
    } catch (shutdownError) {
      runtime.logger.error('Application shutdown failed.', { error: shutdownError });
      process.exitCode = 1;
    }
    if (error) process.exitCode = 1;
  };

  process.once('SIGINT', () => void terminate('SIGINT'));
  process.once('SIGTERM', () => void terminate('SIGTERM'));
  process.once('uncaughtException', (error) => void terminate('uncaughtException', error));
  process.once('unhandledRejection', (error) => void terminate('unhandledRejection', error));
}

export async function main() {
  const logger = createLogger({ environment: config.env, level: config.logLevel });
  try {
    const runtime = await startServer(config, { logger });
    installProcessHandlers(runtime);
    return runtime;
  } catch (error) {
    logStartupFailure(error, logger);
    process.exitCode = 1;
    return null;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  await main();
}
