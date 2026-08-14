import { AppError } from '../utils/app-error.mjs';
import { cleanMultiline } from '../utils/text.mjs';

export function createChatController({ repository, aiService }) {
  return {
    async chat(req, res) {
      const body = req.body || {};
      const message = cleanMultiline(body.message, 2400);
      const history = Array.isArray(body.history) ? body.history.slice(-10).map((entry) => ({
        role: entry?.role === 'assistant' ? 'assistant' : 'user',
        content: cleanMultiline(entry?.content, 1600)
      })).filter((entry) => entry.content) : [];

      if (!message) throw new AppError(400, 'MESSAGE_REQUIRED', 'Enter a message.');
      const recentCheck = await repository.findLatestCheck(req.user.id);
      const reply = await aiService.chat(req.user, { message, history }, recentCheck);
      res.json({ reply });
    }
  };
}
