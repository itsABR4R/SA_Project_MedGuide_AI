import assert from 'node:assert/strict';
import test from 'node:test';
import { createRateLimiter } from '../server/src/middleware/http.middleware.js';

function responseStub() {
  const headers = new Map();
  return {
    headers,
    setHeader(name, value) {
      headers.set(name.toLowerCase(), String(value));
    }
  };
}

test('rate limiter enforces a bounded fixed window and reports retry timing', () => {
  let now = 1_000;
  const middleware = createRateLimiter({ clock: () => now, maxBuckets: 2 })('test', 2, 1_000);
  const request = { ip: '127.0.0.1', socket: {} };

  for (let index = 0; index < 2; index += 1) {
    const response = responseStub();
    let receivedError;
    middleware(request, response, (error) => {
      receivedError = error;
    });
    assert.equal(receivedError, undefined);
  }

  const limitedResponse = responseStub();
  let limitedError;
  middleware(request, limitedResponse, (error) => {
    limitedError = error;
  });
  assert.equal(limitedError.code, 'RATE_LIMITED');
  assert.equal(limitedResponse.headers.get('retry-after'), '1');

  now = 2_001;
  let resetError;
  middleware(request, responseStub(), (error) => {
    resetError = error;
  });
  assert.equal(resetError, undefined);
});
