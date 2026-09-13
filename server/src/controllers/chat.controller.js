import { AppError } from '../utils/app-error.js';
import { cleanMultiline, cleanText } from '../utils/text.js';

function checkScope(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string' || !value.trim() || value.length > 80) {
    throw new AppError(400, 'INVALID_CHAT_SCOPE', 'Select a valid symptom check.');
  }
  return value.trim();
}

function queryScope(req) {
  return req.query.scope === 'unlinked' ? null : checkScope(req.query.checkId);
}

export function createChatController({ chatService }) {
  return {
    async list(req, res) {
      const conversations = await chatService.list(req.user.id, queryScope(req) || null);
      res.json({ conversations });
    },

    async get(req, res) {
      const conversationId = cleanText(req.params.conversationId, 80);
      if (!conversationId) {
        throw new AppError(400, 'CONVERSATION_REQUIRED', 'Select a chat conversation.');
      }
      const conversation = await chatService.get(conversationId, req.user.id, queryScope(req));
      res.json({ conversation });
    },

    async chat(req, res) {
      const body = req.body || {};
      const message = cleanMultiline(body.message, 2400);
      const conversationId = cleanText(body.conversationId, 80);
      const contextLabel = cleanText(body.contextLabel, 120);
      const contextSummary = cleanMultiline(body.contextSummary, 6000);
      const history = Array.isArray(body.history)
        ? body.history
            .slice(-10)
            .map((entry) => ({
              role: entry?.role === 'assistant' ? 'assistant' : 'user',
              content: cleanMultiline(entry?.content, 1600)
            }))
            .filter((entry) => entry.content)
        : [];

      if (!message) throw new AppError(400, 'MESSAGE_REQUIRED', 'Enter a message.');
      const result = await chatService.send(req.user, {
        message,
        history,
        conversationId,
        checkId: checkScope(body.checkId),
        contextLabel,
        contextSummary,
        language: req.language
      });
      res.json(result);
    },

    async branch(req, res) {
      const conversationId = cleanText(req.params.conversationId, 80);
      const sourceMessageId = cleanText(req.body?.sourceMessageId, 80);
      if (!conversationId) {
        throw new AppError(400, 'CONVERSATION_REQUIRED', 'Select a chat conversation.');
      }
      if (!sourceMessageId) {
        throw new AppError(400, 'BRANCH_SOURCE_REQUIRED', 'Select an AI response to start a branch.');
      }
      const result = await chatService.branch(
        req.user,
        conversationId,
        sourceMessageId,
        req.language,
        checkScope(req.body?.checkId)
      );
      res.status(201).json(result);
    },

    async remove(req, res) {
      const conversationId = cleanText(req.params.conversationId, 80);
      if (!conversationId) {
        throw new AppError(400, 'CONVERSATION_REQUIRED', 'Select a chat conversation.');
      }
      await chatService.remove(conversationId, req.user.id);
      res.json({ ok: true });
    }
  };
}
