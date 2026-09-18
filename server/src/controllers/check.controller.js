import { AppError } from '../utils/app-error.js';
import { normalizeAnalysis, sourcesForAnalysis } from '../constants/health.js';
import { cleanMultiline, cleanText, normalizeStringArray } from '../utils/text.js';

function checkResponse(check, language) {
  const analysis = normalizeAnalysis(check.analysis, check.language || language);
  return { ...check, analysis, sources: sourcesForAnalysis(analysis, language) };
}

export function createCheckController({ repository, aiService, chatService }) {
  return {
    async analyze(req, res) {
      const body = req.body || {};
      const language = req.language || 'en';
      const symptoms = cleanMultiline(body.symptoms, 4000);
      const severity = ['mild', 'moderate', 'severe'].includes(body.severity) ? body.severity : 'mild';
      const tags = normalizeStringArray(body.tags, 12, 60);
      if (symptoms.length < 5 && tags.length === 0) {
        throw new AppError(400, 'SYMPTOMS_REQUIRED', 'Describe your symptoms or select at least one tag.');
      }

      const analysis = await aiService.analyze(req.user, { symptoms, severity, tags, language });
      const check = await repository.createCheck({
        userId: req.user.id,
        accountType: req.user.accountType === 'guest' ? 'guest' : 'registered',
        symptoms,
        severity,
        tags,
        language,
        analysis
      });
      res.json({ check: checkResponse(check, language) });
    },

    async list(req, res) {
      const checks = await repository.listChecks(req.user.id);
      res.json({ checks: checks.map((check) => checkResponse(check, req.language)) });
    },

    async remove(req, res) {
      const checkId = cleanText(req.params.checkId, 80);
      await chatService.linkLegacyConversations(req.user.id);
      const deleted = checkId && (await repository.deleteCheck(checkId, req.user.id));
      if (!deleted) throw new AppError(404, 'CHECK_NOT_FOUND', 'That saved check was not found.');
      res.json({ ok: true });
    }
  };
}
