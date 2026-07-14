import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('CI exposes stable least-privilege quality checks', () => {
  const workflow = fs.readFileSync(path.join(repoRoot, '.github', 'workflows', 'ci.yml'), 'utf8');
  for (const name of ['Application quality', 'Security and dependencies', 'Migration integrity']) {
    assert.match(workflow, new RegExp(`name: ${name}`));
  }
  assert.match(workflow, /^permissions:\n  contents: read$/m);
  assert.match(workflow, /node-version: 22/g);
  assert.match(workflow, /working-directory: app\n[\s\S]*?npm run lint/);
  assert.equal(workflow.match(/run: npm ci/g)?.length, 1);
  assert.match(workflow, /npm audit --package-lock-only --audit-level=high/);
  assert.equal(workflow.match(/persist-credentials: false/g)?.length, 3);
  assert.match(workflow, /check:secrets/);
  assert.match(workflow, /check:migrations/);
  assert.match(workflow, /supabase db reset --local/);
  assert.match(workflow, /supabase db lint --local --level error/);
  assert.doesNotMatch(workflow, /\$\{\{\s*secrets\./);
});

test('lint dependencies and command are exact and substantive', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'app', 'package.json'), 'utf8'));
  assert.equal(manifest.devDependencies.eslint, '9.39.5');
  assert.equal(manifest.devDependencies['eslint-config-expo'], '9.2.0');
  assert.equal(manifest.scripts.lint, 'eslint . --max-warnings 0');
});

test('migration checksum inventory exactly matches the SQL files', () => {
  const directory = path.join(repoRoot, 'supabase', 'migrations');
  const expected = new Map(fs.readFileSync(path.join(directory, 'checksums.sha256'), 'utf8')
    .trim().split(/\r?\n/).map((line) => [line.slice(66), line.slice(0, 64)]));
  const migrations = fs.readdirSync(directory).filter((name) => name.endsWith('.sql')).sort();
  assert.deepEqual([...expected.keys()], migrations);
  for (const name of migrations) {
    const actual = createHash('sha256').update(fs.readFileSync(path.join(directory, name))).digest('hex');
    assert.equal(expected.get(name), actual, name);
  }
});
