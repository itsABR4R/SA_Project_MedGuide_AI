import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { config } from '../src/config/env.mjs';
import { connectDatabase } from '../src/config/database.mjs';
import { registerModels } from '../src/models/index.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');

function argumentValue(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function usage() {
  console.log(`Import the former JSON data store into MongoDB.

Usage:
  npm run db:migrate
  npm run db:migrate -- --file /absolute/path/to/app.json

The command uses MONGODB_URI from .env and safely upserts existing records.`);
}

function dateValue(value, fallback = new Date()) {
  if (typeof value === 'number' && value > 0 && value < 10_000_000_000) {
    value *= 1000;
  }
  const date = new Date(value ?? fallback);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function requiredString(value, field) {
  const normalized = String(value || '').trim();
  if (!normalized) throw new Error(`A record is missing the required field: ${field}`);
  return normalized;
}

function arraysFrom(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('The migration file must contain a JSON object.');
  }
  const keys = ['users', 'sessions', 'checks'];
  for (const key of keys) {
    if (value[key] !== undefined && !Array.isArray(value[key])) {
      throw new Error(`The migration field "${key}" must be an array.`);
    }
  }
  return {
    users: value.users || [],
    sessions: value.sessions || [],
    checks: value.checks || []
  };
}

async function migrateUsers(User, users) {
  for (const entry of users) {
    const id = requiredString(entry.id || entry._id, 'users[].id');
    const createdAt = dateValue(entry.createdAt);
    await User.updateOne(
      { _id: id },
      {
        $set: {
          email: requiredString(entry.email, 'users[].email').toLowerCase(),
          name: requiredString(entry.name, 'users[].name'),
          age: entry.age === null || entry.age === undefined || entry.age === '' ? null : Number(entry.age),
          bloodType: String(entry.bloodType || '').toUpperCase(),
          allergies: String(entry.allergies || ''),
          // Imported accounts predate the product tour and should not receive
          // a surprise onboarding flow after migration.
          onboardingCompleted: entry.onboardingCompleted === false ? false : true,
          passwordSalt: requiredString(entry.passwordSalt, 'users[].passwordSalt'),
          passwordHash: requiredString(entry.passwordHash, 'users[].passwordHash'),
          createdAt,
          updatedAt: dateValue(entry.updatedAt, createdAt)
        }
      },
      { upsert: true, runValidators: true, timestamps: false }
    );
  }
}

async function migrateSessions(Session, sessions) {
  for (const entry of sessions) {
    const tokenHash = requiredString(entry.tokenHash, 'sessions[].tokenHash');
    await Session.updateOne(
      { tokenHash },
      {
        $set: {
          tokenHash,
          userId: requiredString(entry.userId, 'sessions[].userId'),
          createdAt: dateValue(entry.createdAt),
          expiresAt: dateValue(entry.expiresAt)
        }
      },
      { upsert: true, runValidators: true }
    );
  }
}

async function migrateChecks(HealthCheck, checks) {
  for (const entry of checks) {
    const id = requiredString(entry.id || entry._id, 'checks[].id');
    await HealthCheck.updateOne(
      { _id: id },
      {
        $set: {
          userId: requiredString(entry.userId, 'checks[].userId'),
          symptoms: String(entry.symptoms || ''),
          severity: entry.severity || 'mild',
          tags: Array.isArray(entry.tags) ? entry.tags : [],
          analysis: entry.analysis,
          createdAt: dateValue(entry.createdAt)
        }
      },
      { upsert: true, runValidators: true, timestamps: false }
    );
  }
}

async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    usage();
    return;
  }

  const requestedPath = argumentValue('--file') || path.join(projectRoot, 'data', 'app.json');
  const inputPath = path.resolve(process.cwd(), requestedPath);
  const raw = await fs.readFile(inputPath, 'utf8');
  const records = arraysFrom(JSON.parse(raw));

  const connection = await connectDatabase(config.mongodb);
  try {
    const { User, Session, HealthCheck } = registerModels(connection);
    await migrateUsers(User, records.users);
    await migrateSessions(Session, records.sessions);
    await migrateChecks(HealthCheck, records.checks);
    console.log('Migration complete.', {
      users: records.users.length,
      sessions: records.sessions.length,
      checks: records.checks.length
    });
  } finally {
    await connection.close();
  }
}

main().catch((error) => {
  console.error('Migration failed.', { name: error.name, code: error.code, message: error.message });
  process.exitCode = 1;
});
