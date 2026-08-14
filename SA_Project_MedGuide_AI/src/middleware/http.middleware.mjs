import { AppError } from '../utils/app-error.mjs';

export function securityHeaders(_req, res, next) {
  res.set({
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
  });
  next();
}

export function originGuard(req, _res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  const origin = req.get('origin');
  if (!origin) return next();
  const forwardedProtocol = String(req.get('x-forwarded-proto') || '').split(',')[0].trim();
  const protocol = forwardedProtocol || req.protocol || 'http';
  const expected = `${protocol}://${req.get('host')}`;
  if (origin !== expected) return next(new AppError(403, 'ORIGIN_REJECTED', 'The request origin was rejected.'));
  next();
}

export function requireJsonForMutation(req, _res, next) {
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) return next();
  const hasBody = Number(req.get('content-length') || 0) > 0 || Boolean(req.get('transfer-encoding'));
  if (!hasBody) return next();
  if (!req.is('application/json')) return next(new AppError(415, 'JSON_REQUIRED', 'Send the request as JSON.'));
  next();
}

export function createRateLimiter() {
  const buckets = new Map();
  return function rateLimit(bucket, limit, windowMs) {
    return function rateLimitMiddleware(req, _res, next) {
      const now = Date.now();
      const key = `${bucket}:${req.ip || req.socket.remoteAddress || 'unknown'}`;
      const recent = (buckets.get(key) || []).filter((timestamp) => timestamp > now - windowMs);
      if (recent.length >= limit) {
        return next(new AppError(429, 'RATE_LIMITED', 'Too many requests. Please wait a moment and try again.'));
      }
      recent.push(now);
      buckets.set(key, recent);
      next();
    };
  };
}
