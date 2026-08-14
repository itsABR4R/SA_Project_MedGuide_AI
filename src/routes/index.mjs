import { Router } from 'express';
import { createRateLimiter } from '../middleware/http.middleware.mjs';
import { createAuthRoutes } from './auth.routes.mjs';
import { createUserRoutes } from './user.routes.mjs';
import { createCheckRoutes } from './check.routes.mjs';
import { createChatRoutes } from './chat.routes.mjs';
import { createSystemRoutes } from './system.routes.mjs';

export function createApiRouter({ controllers, requireUser }) {
  const router = Router();
  const rateLimit = createRateLimiter();
  router.use(createSystemRoutes({ controller: controllers.system }));
  router.use(createAuthRoutes({ controller: controllers.auth, rateLimit, requireUser }));
  router.use(createUserRoutes({ controller: controllers.user, requireUser }));
  router.use(createCheckRoutes({ controller: controllers.check, requireUser, rateLimit }));
  router.use(createChatRoutes({ controller: controllers.chat, requireUser, rateLimit }));
  return router;
}
