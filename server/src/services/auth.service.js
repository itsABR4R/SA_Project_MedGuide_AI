import { AppError } from '../utils/app-error.js';
import {
  hashPassword,
  newSessionToken,
  parseCookies,
  passwordMatches,
  sessionCookie,
  tokenHash
} from '../utils/auth.js';
import { publicUser } from '../utils/serializers.js';
import { cleanText, normalizeEmail } from '../utils/text.js';

export function createAuthService({ repository, config, logger }) {
  async function createSession(user) {
    const token = newSessionToken();
    const now = new Date();
    await repository.createSession({
      tokenHash: tokenHash(token),
      userId: user.id,
      accountType: user.accountType === 'guest' ? 'guest' : 'registered',
      createdAt: now,
      expiresAt: new Date(now.getTime() + config.session.maxAgeSeconds * 1000)
    });
    return token;
  }

  async function rollBackIncompleteUser(user, message) {
    try {
      await repository.deleteUser(user.id, user.accountType);
    } catch (rollbackError) {
      logger?.error(message, {
        userId: user.id,
        accountType: user.accountType,
        error: rollbackError
      });
    }
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
          accountType: 'registered',
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
        if (error.code === 11000)
          throw new AppError(409, 'EMAIL_EXISTS', 'An account already exists for that email.');
        throw error;
      }

      let token;
      try {
        token = await createSession(user);
      } catch (error) {
        await rollBackIncompleteUser(user, 'Failed to roll back an incomplete account registration.');
        throw error;
      }
      return { user: publicUser(user), token };
    },

    async registerGuest(input) {
      const name = cleanText(input.name, 80);
      const age = Number(input.age);
      const occupation = cleanText(input.occupation, 120);

      if (name.length < 2) throw new AppError(400, 'INVALID_NAME', 'Enter your name.');
      if (!Number.isInteger(age) || age < 13 || age > 120) {
        throw new AppError(400, 'INVALID_AGE', 'Enter an age from 13 to 120.');
      }
      if (occupation.length < 2) {
        throw new AppError(400, 'INVALID_OCCUPATION', 'Enter your occupation.');
      }

      const user = await repository.createGuestUser({
        accountType: 'guest',
        name,
        age,
        occupation,
        bloodType: '',
        allergies: '',
        onboardingCompleted: false
      });

      let token;
      try {
        token = await createSession(user);
      } catch (error) {
        await rollBackIncompleteUser(user, 'Failed to roll back an incomplete guest registration.');
        throw error;
      }
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

      const token = await createSession(user);
      return { user: publicUser(user), token };
    },

    async authenticate(req) {
      const token = parseCookies(req)[config.session.cookieName];
      if (!token) return null;
      const session = await repository.findSession(tokenHash(token), new Date());
      if (!session) return null;
      return repository.findUserById(session.userId, session.accountType);
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
