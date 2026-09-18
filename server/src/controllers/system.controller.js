export function createSystemController({ repository, aiService, getDatabaseStatus }) {
  return {
    health(_req, res) {
      const status = getDatabaseStatus();
      const healthy = status === 'connected';
      res.status(healthy ? 200 : 503).json({
        ok: healthy,
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        database: { provider: repository.kind, status },
        aiConfigured: aiService.isConfigured(),
        provider: aiService.provider,
        model: aiService.model,
        privacy: aiService.privacy
      });
    }
  };
}
