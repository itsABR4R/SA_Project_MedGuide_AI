import express from 'express';
import compression from 'compression';
import { createLogger } from './config/logger.js';
import { createAuthService } from './services/auth.service.js';
import { createChatService } from './services/chat.service.js';
import { createSpeechService } from './services/speech.service.js';
import { createSpeechController } from './controllers/speech.controller.js';
import { createAuthController } from './controllers/auth.controller.js';
import { createUserController } from './controllers/user.controller.js';
import { createCheckController } from './controllers/check.controller.js';
import { createChatController } from './controllers/chat.controller.js';
import { createSystemController } from './controllers/system.controller.js';
import { createRequireUser } from './middleware/auth.middleware.js';
import { createErrorHandler, notFound } from './middleware/error.middleware.js';
import { createSecurityHeaders, originGuard, requireJsonForMutation } from './middleware/http.middleware.js';
import { createRequestContext, noStoreApiResponses } from './middleware/request-context.middleware.js';
import { createApiRouter } from './routes/index.js';

export function createApp({
  repository,
  aiService,
  speechService: suppliedSpeechService,
  config,
  logger: suppliedLogger,
  getDatabaseStatus = () => 'connected'
}) {
  const logger = suppliedLogger || createLogger({ environment: config.env, level: config.logLevel });
  const app = express();
  app.disable('x-powered-by');
  app.set('json escape', true);
  if (config.trustProxy) app.set('trust proxy', 1);

  const authService = createAuthService({
    repository,
    config,
    logger: logger.child({ component: 'auth' })
  });
  const chatService = createChatService({ repository, aiService });
  const speechService = suppliedSpeechService || createSpeechService({ config });
  const requireUser = createRequireUser(authService);
  const controllers = {
    auth: createAuthController({ authService }),
    user: createUserController({ repository, aiService }),
    check: createCheckController({ repository, aiService, chatService }),
    chat: createChatController({ chatService }),
    speech: createSpeechController({ speechService }),
    system: createSystemController({ repository, aiService, getDatabaseStatus })
  };

  app.use(createRequestContext({ logger }));
  app.use(createSecurityHeaders({ production: config.env === 'production' }));
  app.use(compression({ threshold: 1_024 }));
  app.use(originGuard);
  app.use('/api', noStoreApiResponses);
  app.use('/api', requireJsonForMutation);
  app.use(express.json({ limit: config.http?.bodyLimit || '48kb', strict: true }));
  app.use('/api', createApiRouter({ controllers, requireUser }));
  app.use(
    express.static(config.publicDir, {
      index: 'index.html',
      maxAge: config.env === 'production' ? '1y' : 0,
      setHeaders(res, filePath) {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        } else if (config.env === 'production' && filePath.includes('/assets/')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      }
    })
  );
  app.get(/^(?!\/api(?:\/|$)).*/, (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile('index.html', { root: config.publicDir });
  });
  app.use(notFound);
  app.use(createErrorHandler({ logger }));
  return app;
}
