import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';

export function createChatRoutes({ controller, requireUser, rateLimit }) {
  const router = Router();
  router.get('/chat/conversations', requireUser, asyncHandler(controller.list));
  router.get('/chat/conversations/:conversationId', requireUser, asyncHandler(controller.get));
  router.post(
    '/chat/conversations/:conversationId/branches',
    requireUser,
    rateLimit('chat-branch', 20, 10 * 60 * 1000),
    asyncHandler(controller.branch)
  );
  router.delete('/chat/conversations/:conversationId', requireUser, asyncHandler(controller.remove));
  router.post('/chat', requireUser, rateLimit('ai-chat', 30, 10 * 60 * 1000), asyncHandler(controller.chat));
  return router;
}
