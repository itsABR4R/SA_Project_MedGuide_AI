import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.mjs';

export function createChatRoutes({ controller, requireUser, rateLimit }) {
  const router = Router();
  router.post('/chat', requireUser, rateLimit('ai-chat', 30, 10 * 60 * 1000), asyncHandler(controller.chat));
  return router;
}
