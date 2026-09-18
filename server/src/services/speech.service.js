import { AppError } from '../utils/app-error.js';

// Vercel Functions cap request and response bodies at 4.5 MB. Keep enough room
// for response metadata while retaining the existing MP3 response contract.
const MAX_AUDIO_BYTES = 4 * 1024 * 1024;

function audioTooLargeError() {
  return new AppError(
    502,
    'TTS_INVALID_RESPONSE',
    'The speech response was too large. Try a shorter response.'
  );
}

function providerError(status) {
  if (status === 401 || status === 403)
    return new AppError(
      503,
      'AI_CONFIGURATION_ERROR',
      'OpenRouter rejected the API key. Check the server configuration.'
    );
  if (status === 402)
    return new AppError(503, 'AI_CREDITS_REQUIRED', 'OpenRouter credits are required to generate speech.');
  if (status === 429)
    return new AppError(
      429,
      'AI_RATE_LIMIT',
      'OpenRouter is temporarily rate-limited. Please try again shortly.'
    );
  if (status === 400 || status === 404)
    return new AppError(
      503,
      'TTS_ROUTE_UNAVAILABLE',
      'The configured speech model or voice is unavailable. Check the server speech settings.'
    );
  return new AppError(502, 'TTS_SERVICE_ERROR', 'Speech could not be generated. Please try again.');
}

export function createSpeechService({ config, fetchImpl = globalThis.fetch }) {
  const provider = config.openRouter;
  return {
    async speak(text, { signal } = {}) {
      if (!provider.apiKey)
        throw new AppError(
          503,
          'AI_NOT_CONFIGURED',
          'Add OPENROUTER_API_KEY to enable speech when a device voice is unavailable.'
        );
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), provider.timeoutMs || 45_000);
      const combinedSignal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
      try {
        const response = await fetchImpl(
          provider.speechApiUrl || 'https://openrouter.ai/api/v1/audio/speech',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${provider.apiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': provider.appUrl,
              'X-OpenRouter-Title': provider.appName
            },
            body: JSON.stringify({
              model: provider.speechModel || 'google/gemini-3.1-flash-tts-preview',
              voice: provider.speechVoice || 'Kore',
              input: text,
              response_format: 'mp3'
            }),
            signal: combinedSignal
          }
        );
        if (!response.ok) {
          await response.body?.cancel();
          throw providerError(response.status);
        }
        if (!/^audio\/mpeg(?:;|$)/i.test(response.headers.get('content-type') || '') || !response.body) {
          await response.body?.cancel();
          throw new AppError(
            502,
            'TTS_INVALID_RESPONSE',
            'The speech service returned invalid audio. Please try again.'
          );
        }
        const declaredSize = Number(response.headers.get('content-length'));
        if (Number.isFinite(declaredSize) && declaredSize > MAX_AUDIO_BYTES) {
          await response.body.cancel();
          throw audioTooLargeError();
        }
        const chunks = [];
        let size = 0;
        for await (const chunk of response.body) {
          size += chunk.byteLength;
          if (size > MAX_AUDIO_BYTES) throw audioTooLargeError();
          chunks.push(Buffer.from(chunk));
        }
        if (!size)
          throw new AppError(
            502,
            'TTS_INVALID_RESPONSE',
            'The speech service returned empty audio. Please try again.'
          );
        return Buffer.concat(chunks);
      } catch (error) {
        if (signal?.aborted) throw error;
        if (controller.signal.aborted)
          throw new AppError(504, 'TTS_TIMEOUT', 'Speech generation took too long. Please try again.');
        if (error instanceof AppError) throw error;
        throw new AppError(
          502,
          'TTS_SERVICE_ERROR',
          'The app could not reach the speech service. Please try again.'
        );
      } finally {
        clearTimeout(timeout);
      }
    }
  };
}
