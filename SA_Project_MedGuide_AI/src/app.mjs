import express from 'express';
import { createAuthService } from './services/auth.service.mjs';
import { createAuthController } from './controllers/auth.controller.mjs';
import { createUserController } from './controllers/user.controller.mjs';
import { createCheckController } from './controllers/check.controller.mjs';
import { createChatController } from './controllers/chat.controller.mjs';
import { createSystemController } from './controllers/system.controller.mjs';
import { createRequireUser } from './middleware/auth.middleware.mjs';
import { errorHandler, notFound } from './middleware/error.middleware.mjs';
import { originGuard, requireJsonForMutation, securityHeaders } from './middleware/http.middleware.mjs';
import { createApiRouter } from './routes/index.mjs';

export function createApp({ repository, aiService, config, getDatabaseStatus = () => 'connected' }) {
  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', 1);

  const authService = createAuthService({ repository, config });
  const requireUser = createRequireUser(authService);
  const controllers = {
    auth: createAuthController({ authService }),
    user: createUserController({ repository, aiService }),
    check: createCheckController({ repository, aiService }),
    chat: createChatController({ repository, aiService }),
    system: createSystemController({ repository, aiService, getDatabaseStatus })
  };

  app.use(securityHeaders);
  app.use(originGuard);
  app.use('/api', requireJsonForMutation);
  app.use(express.json({ limit: '48kb', strict: true }));
  app.use('/api', createApiRouter({ controllers, requireUser }));
  app.use(express.static(config.publicDir, {
    index: 'index.html',
    maxAge: '5m',
    setHeaders(res, filePath) {
      if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
    }
  }));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
