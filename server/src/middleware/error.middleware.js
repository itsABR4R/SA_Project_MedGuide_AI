import { AppError } from '../utils/app-error.js';
import { logger as defaultLogger } from '../config/logger.js';
import { localizedErrorMessage } from '../utils/language.js';

export function notFound(req, _res, next) {
  const api = req.originalUrl.startsWith('/api/');
  next(
    new AppError(404, api ? 'API_NOT_FOUND' : 'NOT_FOUND', api ? 'API route not found.' : 'Page not found.')
  );
}

function normalizeError(error) {
  if (error?.type === 'entity.parse.failed') {
    return new AppError(400, 'INVALID_JSON', 'The request contains invalid JSON.');
  }
  if (error?.type === 'entity.too.large') {
    return new AppError(413, 'REQUEST_TOO_LARGE', 'The request is too large.');
  }
  if (error?.code === 11000) {
    return new AppError(409, 'DUPLICATE_VALUE', 'That value is already in use.');
  }
  if (error?.name === 'ValidationError' || error?.name === 'CastError') {
    return new AppError(400, 'DATABASE_VALIDATION_ERROR', 'The submitted data could not be saved.');
  }
  return error;
}

export function createErrorHandler({ logger = defaultLogger } = {}) {
  return function errorHandler(error, req, res, next) {
    if (res.headersSent) return next(error);

    const normalized = normalizeError(error);
    const isExpected = normalized instanceof AppError;
    const status = isExpected ? normalized.status : 500;
    const code = isExpected ? normalized.code : 'SERVER_ERROR';
    const fallbackMessage = isExpected ? normalized.message : 'Something went wrong on the server.';
    const message = localizedErrorMessage(code, req.language, fallbackMessage);
    const requestLogger = req.log || logger;

    if (!isExpected) {
      requestLogger.error('Unhandled server error.', { error });
    } else if (status >= 500) {
      requestLogger.warn('Request failed because a dependency or configuration was unavailable.', {
        code,
        status
      });
    }

    res.status(status).json({ error: { code, message } });
  };
}
