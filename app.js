// Keep a direct framework import in this root entry for Vercel's Express detector.
import 'express';
import { config } from './server/src/config/env.js';
import { createLogger } from './server/src/config/logger.js';
import { databaseStatus } from './server/src/config/database.js';
import { createRuntime } from './server/src/runtime.js';

const logger = createLogger({ environment: config.env, level: config.logLevel });
const runtime = await createRuntime(config, { logger });

logger.info('MedGuide AI function initialized.', {
  databaseStatus: databaseStatus(runtime.connection),
  aiConfigured: runtime.aiService.isConfigured()
});
if (!runtime.aiService.isConfigured()) {
  logger.warn('OpenRouter is not configured; analysis and chat are unavailable until a key is added.');
}

export default runtime.app;
