import { AppError } from '../utils/app-error.mjs';
import { sourcesForAnalysis } from '../constants/health.mjs';
import { cleanMultiline, cleanText, normalizeStringArray } from '../utils/text.mjs';

function checkResponse(check) {
  return { ...check, sources: sourcesForAnalysis(check.analysis) };
}

export function createCheckController({ repository, aiService }) {
  return {
    async analyze(req, res) {
      const body = req.body || {};
      const symptoms = cleanMultiline(body.symptoms, 4000);
      const severity = ['mild', 'moderate', 'severe'].includes(body.severity) ? body.severity : 'mild';
      const tags = normalizeStringArray(body.tags, 12, 60);
      if (symptoms.length < 5 && tags.length === 0) {
        throw new AppError(400, 'SYMPTOMS_REQUIRED', 'Describe your symptoms or select at least one tag.');
      }

      const analysis = await aiService.analyze(req.user, { symptoms, severity, tags });
      const check = await repository.createCheck({ userId: req.user.id, symptoms, severity, tags, analysis });
      res.json({ check: checkResponse(check) });
    },

    async list(req, res) {
      const checks = await repository.listChecks(req.user.id);
      res.json({ checks: checks.map(checkResponse) });
    },

    async remove(req, res) {
      const checkId = cleanText(req.params.checkId, 80);
      const deleted = checkId && await repository.deleteCheck(checkId, req.user.id);
      if (!deleted) throw new AppError(404, 'CHECK_NOT_FOUND', 'That saved check was not found.');
      res.json({ ok: true });
    }
  };
}
