import { normalizeLanguage, translate } from '../i18n/messages.js';

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

let unauthorizedHandler = null;
let apiLanguage = (() => {
  try {
    return normalizeLanguage(window.localStorage.getItem('medguide.language'));
  } catch {
    return 'en';
  }
})();
const REQUEST_TIMEOUT_MS = 65_000;

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

export function setApiLanguage(language) {
  apiLanguage = normalizeLanguage(language);
}

export async function api(path, { responseType = 'json', ...options } = {}) {
  const timeoutController = new AbortController();
  const timeout = window.setTimeout(() => timeoutController.abort(), REQUEST_TIMEOUT_MS);
  const signals = [options.signal, timeoutController.signal].filter(Boolean);
  const signal = signals.length > 1 && AbortSignal.any ? AbortSignal.any(signals) : signals[0];

  try {
    const response = await fetch(path, {
      credentials: 'same-origin',
      ...options,
      signal,
      headers: {
        'Accept-Language': apiLanguage === 'bn' ? 'bn-BD' : 'en-US',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {})
      }
    });

    if (response.ok && responseType === 'audio') {
      if (!/^audio\/mpeg(?:;|$)/i.test(response.headers.get('content-type') || '')) {
        throw new ApiError(
          502,
          'TTS_INVALID_RESPONSE',
          translate(apiLanguage, 'The response could not be read aloud. Please try again.')
        );
      }
      return await response.blob();
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new ApiError(
        response.status,
        payload?.error?.code || 'REQUEST_FAILED',
        payload?.error?.message || translate(apiLanguage, 'The request failed.')
      );
      if (response.status === 401 && !['/api/login', '/api/me'].includes(path)) unauthorizedHandler?.();
      throw error;
    }
    return payload;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (timeoutController.signal.aborted) {
      throw new ApiError(
        0,
        'REQUEST_TIMEOUT',
        translate(apiLanguage, 'The request took too long. Please try again.')
      );
    }
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      translate(apiLanguage, 'Cannot reach the app server. Make sure it is running and try again.')
    );
  } finally {
    window.clearTimeout(timeout);
  }
}
