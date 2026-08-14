import { Router } from 'express';

export function createSystemRoutes({ controller }) {
  const router = Router();
  router.get('/health', controller.health);
  return router;
}
