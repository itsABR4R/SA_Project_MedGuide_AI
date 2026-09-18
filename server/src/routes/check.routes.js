import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';

export function createCheckRoutes({ controller, requireUser, rateLimit }) {
  const router = Router();
  router.post(
    '/analyze',
    requireUser,
    rateLimit('ai-analysis', 20, 10 * 60 * 1000),
    asyncHandler(controller.analyze)
  );
  router.get('/checks', requireUser, asyncHandler(controller.list));
  router.delete('/checks/:checkId', requireUser, asyncHandler(controller.remove));
  return router;
}
