import { AppError } from '../utils/app-error.js';

export function createRequireUser(authService) {
  return async function requireUser(req, _res, next) {
    try {
      const user = await authService.authenticate(req);
      if (!user) throw new AppError(401, 'AUTH_REQUIRED', 'Please sign in to continue.');
      req.user = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}
