import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('package is configured for the native local MongoDB service', async () => {
  const packageJson = JSON.parse(await fs.readFile(path.join(projectRoot, 'package.json'), 'utf8'));
  const envExample = await fs.readFile(path.join(projectRoot, '.env.example'), 'utf8');

  assert.equal(packageJson.scripts['db:check'], 'node scripts/check-mongodb.mjs');
  assert.equal(packageJson.scripts['db:view'], 'node scripts/view-database.mjs');
  assert.equal(packageJson.scripts['db:up'], undefined);
  assert.equal(packageJson.scripts['db:down'], undefined);
  assert.match(envExample, /^MONGODB_URI=mongodb:\/\/127\.0\.0\.1:27017\/medguide_ai$/m);
  await assert.rejects(fs.access(path.join(projectRoot, 'compose.yaml')));
});
