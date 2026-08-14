import { AppError } from '../utils/app-error.mjs';

export function notFound(req, _res, next) {
  const api = req.originalUrl.startsWith('/api/');
  next(new AppError(404, api ? 'API_NOT_FOUND' : 'NOT_FOUND', api ? 'API route not found.' : 'Page not found.'));
}

export function errorHandler(error, _req, res, _next) {
  let normalized = error;
  if (error?.type === 'entity.parse.failed') {
    normalized = new AppError(400, 'INVALID_JSON', 'The request contains invalid JSON.');
  } else if (error?.type === 'entity.too.large') {
    normalized = new AppError(413, 'REQUEST_TOO_LARGE', 'The request is too large.');
  } else if (error?.code === 11000) {
    normalized = new AppError(409, 'DUPLICATE_VALUE', 'That value is already in use.');
  } else if (error?.name === 'ValidationError' || error?.name === 'CastError') {
    normalized = new AppError(400, 'DATABASE_VALIDATION_ERROR', 'The submitted data could not be saved.');
  }

  const isExpected = normalized instanceof AppError;
  const status = isExpected ? normalized.status : 500;
  const code = isExpected ? normalized.code : 'SERVER_ERROR';
  const message = isExpected ? normalized.message : 'Something went wrong on the server.';
  if (!isExpected) console.error('Unhandled server error.', { name: error?.name || 'Error', code: error?.code });
  if (!res.headersSent) res.status(status).json({ error: { code, message } });
}
