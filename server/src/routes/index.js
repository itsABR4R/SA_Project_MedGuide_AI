import { Router } from 'express';
import { createRateLimiter } from '../middleware/http.middleware.js';
import { createAuthRoutes } from './auth.routes.js';
import { createUserRoutes } from './user.routes.js';
import { createCheckRoutes } from './check.routes.js';
import { createChatRoutes } from './chat.routes.js';
import { createSystemRoutes } from './system.routes.js';
import { createSpeechRoutes } from './speech.routes.js';

export function createApiRouter({ controllers, requireUser }) {
  const router = Router();
  const rateLimit = createRateLimiter();
  router.use(createSystemRoutes({ controller: controllers.system }));
  router.use(createAuthRoutes({ controller: controllers.auth, rateLimit, requireUser }));
  router.use(createUserRoutes({ controller: controllers.user, requireUser }));
  router.use(createCheckRoutes({ controller: controllers.check, requireUser, rateLimit }));
  router.use(createChatRoutes({ controller: controllers.chat, requireUser, rateLimit }));
  router.use(createSpeechRoutes({ controller: controllers.speech, requireUser, rateLimit }));
  return router;
}
