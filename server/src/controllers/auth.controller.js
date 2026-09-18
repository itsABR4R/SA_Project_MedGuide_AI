export function createAuthController({ authService }) {
  return {
    async register(req, res) {
      const result = await authService.register(req.body || {});
      res.setHeader('Set-Cookie', authService.cookie(result.token));
      res.status(201).json({ user: result.user });
    },

    async registerGuest(req, res) {
      const result = await authService.registerGuest(req.body || {});
      res.setHeader('Set-Cookie', authService.cookie(result.token));
      res.status(201).json({ user: result.user });
    },

    async login(req, res) {
      const result = await authService.login(req.body || {});
      res.setHeader('Set-Cookie', authService.cookie(result.token));
      res.json({ user: result.user });
    },

    async logout(req, res) {
      await authService.logout(req);
      res.setHeader('Set-Cookie', authService.cookie('', 0));
      res.json({ ok: true });
    }
  };
}
