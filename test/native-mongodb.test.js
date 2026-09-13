import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function filesBelow(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const target = path.join(directory, entry.name);
      return entry.isDirectory() ? filesBelow(target) : [target];
    })
  );
  return files.flat();
}

test('MERN package is configured for the local MongoDB service', async () => {
  const packageJson = JSON.parse(await fs.readFile(path.join(projectRoot, 'package.json'), 'utf8'));
  const envExample = await fs.readFile(path.join(projectRoot, '.env.example'), 'utf8');

  assert.equal(packageJson.scripts['db:check'], 'node scripts/check-mongodb.js');
  assert.equal(packageJson.scripts['db:view'], 'node scripts/view-database.js');
  assert.equal(packageJson.scripts['db:up'], undefined);
  assert.equal(packageJson.scripts['db:down'], undefined);
  assert.match(envExample, /^MONGODB_URI=mongodb:\/\/127\.0\.0\.1:27017\/medguide_ai$/m);
  await assert.rejects(fs.access(path.join(projectRoot, 'compose.yaml')));
});

test('project-owned Node modules use standard .js extensions', async () => {
  const roots = ['server', 'scripts', 'test'].map((name) => path.join(projectRoot, name));
  const files = (await Promise.all(roots.map(filesBelow))).flat();
  assert.equal(
    files.some((file) => file.endsWith('.mjs')),
    false
  );

  const packageJson = await fs.readFile(path.join(projectRoot, 'package.json'), 'utf8');
  assert.doesNotMatch(packageJson, /\.mjs\b/);
});
