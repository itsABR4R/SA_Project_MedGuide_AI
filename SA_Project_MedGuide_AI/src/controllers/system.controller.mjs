export function createSystemController({ repository, aiService, getDatabaseStatus }) {
  return {
    health(_req, res) {
      res.json({
        ok: true,
        database: { provider: repository.kind, status: getDatabaseStatus() },
        aiConfigured: aiService.isConfigured(),
        provider: aiService.provider,
        model: aiService.model,
        privacy: aiService.privacy
      });
    }
  };
}
