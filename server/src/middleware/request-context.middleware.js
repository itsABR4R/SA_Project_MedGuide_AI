import crypto from 'node:crypto';
import { logger as defaultLogger } from '../config/logger.js';
import { requestLanguage } from '../utils/language.js';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,80}$/;

function requestId(req) {
  const supplied = String(req.get('x-request-id') || '').trim();
  return REQUEST_ID_PATTERN.test(supplied) ? supplied : crypto.randomUUID();
}

export function createRequestContext({ logger = defaultLogger } = {}) {
  return function requestContext(req, res, next) {
    const id = requestId(req);
    const startedAt = process.hrtime.bigint();
    req.id = id;
    req.language = requestLanguage(req);
    req.log = logger.child({ requestId: id });
    res.setHeader('X-Request-Id', id);
    res.setHeader('Content-Language', req.language === 'bn' ? 'bn-BD' : 'en-US');

    res.once('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      req.log.info('HTTP request completed.', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Number(durationMs.toFixed(1))
      });
    });

    next();
  };
}

export function noStoreApiResponses(_req, res, next) {
  res.setHeader('Cache-Control', 'no-store');
  next();
}
