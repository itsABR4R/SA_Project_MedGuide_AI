import { AppError } from '../utils/app-error.mjs';
import { hashPassword, newSessionToken, parseCookies, passwordMatches, sessionCookie, tokenHash } from '../utils/auth.mjs';
import { publicUser } from '../utils/serializers.mjs';
import { cleanText, normalizeEmail } from '../utils/text.mjs';

export function createAuthService({ repository, config }) {
  async function createSession(userId) {
    const token = newSessionToken();
    const now = new Date();
    await repository.createSession({
      tokenHash: tokenHash(token),
      userId,
      createdAt: now,
      expiresAt: new Date(now.getTime() + config.session.maxAgeSeconds * 1000)
    });
    return token;
  }

  return {
    async register(input) {
      const name = cleanText(input.name, 80);
      const email = normalizeEmail(input.email);
      const password = String(input.password || '');

      if (name.length < 2) throw new AppError(400, 'INVALID_NAME', 'Enter your name.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 180) {
        throw new AppError(400, 'INVALID_EMAIL', 'Enter a valid email address.');
      }
      if (password.length < 8 || password.length > 200) {
        throw new AppError(400, 'INVALID_PASSWORD', 'Use a password with at least 8 characters.');
      }

      const existing = await repository.findUserByEmail(email);
      if (existing) throw new AppError(409, 'EMAIL_EXISTS', 'An account already exists for that email.');

      const passwordRecord = await hashPassword(password);
      let user;
      try {
        user = await repository.createUser({
          email,
          name,
          passwordSalt: passwordRecord.salt,
          passwordHash: passwordRecord.hash,
          age: null,
          bloodType: '',
          allergies: '',
          onboardingCompleted: false
        });
      } catch (error) {
        if (error.code === 11000) throw new AppError(409, 'EMAIL_EXISTS', 'An account already exists for that email.');
        throw error;
      }

      const token = await createSession(user.id);
      return { user: publicUser(user), token };
    },

    async login(input) {
      const email = normalizeEmail(input.email);
      const password = String(input.password || '');
      const user = await repository.findUserByEmail(email, { includePassword: true });

      if (!user || !(await passwordMatches(password, user))) {
        await new Promise((resolve) => setTimeout(resolve, 180));
        throw new AppError(401, 'INVALID_LOGIN', 'Email or password is incorrect.');
      }

      const token = await createSession(user.id);
      return { user: publicUser(user), token };
    },

    async authenticate(req) {
      const token = parseCookies(req)[config.session.cookieName];
      if (!token) return null;
      const session = await repository.findSession(tokenHash(token), new Date());
      if (!session) return null;
      return repository.findUserById(session.userId);
    },

    async logout(req) {
      const token = parseCookies(req)[config.session.cookieName];
      if (token) await repository.deleteSession(tokenHash(token));
    },

    cookie(token, maxAge) {
      return sessionCookie(config, token, maxAge);
    }
  };
}
