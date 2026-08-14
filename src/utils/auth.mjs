import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(crypto.scrypt);

export async function hashPassword(password, salt = crypto.randomBytes(16).toString('base64url')) {
  const derived = await scryptAsync(password, salt, 64);
  return { salt, hash: Buffer.from(derived).toString('base64url') };
}

export async function passwordMatches(password, user) {
  const candidate = await hashPassword(password, user.passwordSalt);
  const actualBuffer = Buffer.from(user.passwordHash, 'base64url');
  const candidateBuffer = Buffer.from(candidate.hash, 'base64url');
  return actualBuffer.length === candidateBuffer.length && crypto.timingSafeEqual(actualBuffer, candidateBuffer);
}

export function tokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('base64url');
}

export function newSessionToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function parseCookies(req) {
  const result = {};
  for (const pair of String(req.headers.cookie || '').split(';')) {
    const separator = pair.indexOf('=');
    if (separator < 0) continue;
    const key = pair.slice(0, separator).trim();
    const value = pair.slice(separator + 1).trim();
    if (key) result[key] = decodeURIComponent(value);
  }
  return result;
}

export function sessionCookie(config, token, maxAge = config.session.maxAgeSeconds) {
  const secure = config.env === 'production' ? '; Secure' : '';
  return `${config.session.cookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}
