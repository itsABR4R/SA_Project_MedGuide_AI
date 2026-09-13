import { AppError } from '../utils/app-error.js';
import { cleanMultiline } from '../utils/text.js';

export function createSpeechController({ speechService }) {
  return {
    async speak(req, res) {
      const supplied = req.body?.text;
      if (typeof supplied !== 'string' || !supplied.trim())
        throw new AppError(400, 'TTS_TEXT_REQUIRED', 'Select a response to read aloud.');
      if (supplied.length > 4000)
        throw new AppError(400, 'TTS_TEXT_TOO_LONG', 'Read-aloud text must be 4000 characters or fewer.');
      const text = cleanMultiline(supplied, 4000);
      if (!text) throw new AppError(400, 'TTS_TEXT_REQUIRED', 'Select a response to read aloud.');
      const controller = new AbortController();
      const onClose = () => {
        if (!res.writableEnded) controller.abort();
      };
      res.on('close', onClose);
      try {
        const audio = await speechService.speak(text, { signal: controller.signal });
        if (!controller.signal.aborted) res.type('audio/mpeg').send(audio);
      } catch (error) {
        if (!controller.signal.aborted) throw error;
      } finally {
        res.off('close', onClose);
      }
    }
  };
}
