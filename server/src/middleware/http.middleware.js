import { AppError } from '../utils/app-error.js';

export function createSecurityHeaders({ production = false } = {}) {
  return function securityHeaders(req, res, next) {
    res.set({
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; font-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'same-origin',
      'Permissions-Policy': 'camera=(), microphone=(self), geolocation=(), payment=(), usb=()',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
      'X-DNS-Prefetch-Control': 'off',
      'X-Frame-Options': 'DENY',
      'X-Permitted-Cross-Domain-Policies': 'none'
    });
    if (production && req.secure) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  };
}

export function originGuard(req, _res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  const origin = req.get('origin');
  if (!origin) return next();
  const expected = `${req.protocol}://${req.get('host')}`;
  if (origin !== expected)
    return next(new AppError(403, 'ORIGIN_REJECTED', 'The request origin was rejected.'));
  next();
}

export function requireJsonForMutation(req, _res, next) {
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) return next();
  const hasBody = Number(req.get('content-length') || 0) > 0 || Boolean(req.get('transfer-encoding'));
  if (!hasBody) return next();
  if (!req.is('application/json'))
    return next(new AppError(415, 'JSON_REQUIRED', 'Send the request as JSON.'));
  next();
}

export function createRateLimiter({ clock = Date.now, maxBuckets = 5_000 } = {}) {
  const buckets = new Map();

  function pruneExpired(now) {
    for (const [key, record] of buckets) {
      if (record.resetAt <= now) buckets.delete(key);
    }
  }

  return function rateLimit(bucket, limit, windowMs) {
    return function rateLimitMiddleware(req, res, next) {
      const now = clock();
      const key = `${bucket}:${req.ip || req.socket.remoteAddress || 'unknown'}`;
      let record = buckets.get(key);

      if (!record || record.resetAt <= now) {
        if (buckets.size >= maxBuckets) pruneExpired(now);
        if (buckets.size >= maxBuckets && !buckets.has(key)) {
          buckets.delete(buckets.keys().next().value);
        }
        record = { count: 0, resetAt: now + windowMs };
        buckets.set(key, record);
      }

      const remaining = Math.max(0, limit - record.count - 1);
      const resetSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
      res.setHeader('RateLimit-Limit', limit);
      res.setHeader('RateLimit-Remaining', remaining);
      res.setHeader('RateLimit-Reset', resetSeconds);

      if (record.count >= limit) {
        res.setHeader('Retry-After', resetSeconds);
        return next(
          new AppError(429, 'RATE_LIMITED', 'Too many requests. Please wait a moment and try again.')
        );
      }

      record.count += 1;
      next();
    };
  };
}
