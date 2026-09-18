import assert from 'node:assert/strict';
import test from 'node:test';
import { createSpeechService } from '../server/src/services/speech.service.js';

function configuration(apiKey = 'test-key') {
  return {
    openRouter: {
      apiKey,
      speechApiUrl: 'https://openrouter.example/api/v1/audio/speech',
      speechModel: 'google/gemini-3.1-flash-tts-preview',
      speechVoice: 'Kore',
      appUrl: 'http://localhost:3000',
      appName: 'MedGuide AI Test',
      dataCollection: 'deny',
      zeroDataRetention: true,
      timeoutMs: 1_000
    }
  };
}

test('speech service requests MP3 audio with the configured OpenRouter model and voice', async () => {
  let request;
  const speechService = createSpeechService({
    config: configuration(),
    async fetchImpl(url, options) {
      request = { url, options };
      return new Response(Buffer.from('mp3-bytes'), {
        status: 200,
        headers: { 'Content-Type': 'audio/mpeg' }
      });
    }
  });

  const audio = await speechService.speak('পর্যাপ্ত বিশ্রাম নিন।');
  assert.equal(audio.toString(), 'mp3-bytes');
  assert.equal(request.url, 'https://openrouter.example/api/v1/audio/speech');
  assert.equal(request.options.headers.Authorization, 'Bearer test-key');
  assert.deepEqual(JSON.parse(request.options.body), {
    model: 'google/gemini-3.1-flash-tts-preview',
    voice: 'Kore',
    input: 'পর্যাপ্ত বিশ্রাম নিন।',
    response_format: 'mp3'
  });
});

test('speech service reports missing configuration and provider credit failures safely', async () => {
  const unconfigured = createSpeechService({ config: configuration('') });
  await assert.rejects(
    unconfigured.speak('বাংলা'),
    (error) => error.code === 'AI_NOT_CONFIGURED' && error.status === 503
  );

  const noCredits = createSpeechService({
    config: configuration(),
    fetchImpl: async () => new Response('', { status: 402 })
  });
  await assert.rejects(
    noCredits.speak('বাংলা'),
    (error) => error.code === 'AI_CREDITS_REQUIRED' && error.status === 503
  );
});

test('speech service rejects audio too large for a Vercel Function response', async () => {
  const speechService = createSpeechService({
    config: configuration(),
    fetchImpl: async () =>
      new Response(Buffer.from('small-placeholder'), {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': String(4 * 1024 * 1024 + 1)
        }
      })
  });

  await assert.rejects(
    speechService.speak('বাংলা'),
    (error) => error.code === 'TTS_INVALID_RESPONSE' && error.status === 502
  );
});
