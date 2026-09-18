import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';

export function createAuthRoutes({ controller, rateLimit, requireUser }) {
  const router = Router();
  router.post('/register', rateLimit('auth', 12, 15 * 60 * 1000), asyncHandler(controller.register));
  router.post(
    '/guest-register',
    rateLimit('auth', 12, 15 * 60 * 1000),
    asyncHandler(controller.registerGuest)
  );
  router.post('/login', rateLimit('auth', 12, 15 * 60 * 1000), asyncHandler(controller.login));
  router.post('/logout', requireUser, asyncHandler(controller.logout));
  return router;
}
