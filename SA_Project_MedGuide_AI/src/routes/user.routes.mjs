import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.mjs';

export function createUserRoutes({ controller, requireUser }) {
  const router = Router();
  router.get('/me', requireUser, asyncHandler(controller.me));
  router.put('/profile', requireUser, asyncHandler(controller.updateProfile));
  router.patch('/onboarding', requireUser, asyncHandler(controller.completeOnboarding));
  return router;
}
