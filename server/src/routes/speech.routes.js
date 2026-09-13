import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';

export function createSpeechRoutes({ controller, requireUser, rateLimit }) {
  const router = Router();
  router.post(
    '/speech',
    requireUser,
    rateLimit('speech', 20, 10 * 60 * 1000),
    asyncHandler(controller.speak)
  );
  return router;
}
