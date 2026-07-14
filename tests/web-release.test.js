import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

const repositoryRoot = resolve(import.meta.dirname, '..');

function reservePort() {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  return once(server, 'listening').then(() => {
    const { port } = server.address();
    return new Promise((resolvePort) => server.close(() => resolvePort(port)));
  });
}

test('release build contract pins source and disables dotenv/backend inheritance', () => {
  const build = readFileSync(join(repositoryRoot, 'scripts/build-web-release.ps1'), 'utf8');
  const promote = readFileSync(join(repositoryRoot, 'scripts/promote-web-release.ps1'), 'utf8');
  assert.match(build, /git -C \$repositoryRoot archive[\s\S]*\$sourceCommit/);
  assert.match(build, /EXPO_NO_DOTENV', '1'/);
  assert.match(build, /EXPO_PUBLIC_DATA_MODE', 'local'/);
  for (const name of ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY', 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY']) {
    assert.match(build, new RegExp(`Remove-Item Env:${name}`));
  }
  assert.match(build, /ls-tree -r --name-only[\s\S]*\.env/);
  assert.match(build, /Sort-Object[\s\S]*Get-FileHash[\s\S]*artifactSha256/);
  assert.ok(build.includes(".Replace('\\', '/')"), 'manifest paths must use portable forward slashes');
  assert.ok(promote.includes(".Replace('\\', '/')"), 'promotion verification must use the same portable paths');
  assert.match(build, /WaitForExit\(\$TimeoutSeconds \* 1000\)/);
  assert.match(build, /Invoke-BoundedProcess[\s\S]*300 'npm-ci'[\s\S]*300 'expo-export'/);
  assert.doesNotMatch(build, /Get-Date|generatedAt/);
});

test('release preview swaps aliases while retaining SPA, security, and cache contracts', async (t) => {
  const temporary = mkdtempSync(join(tmpdir(), 'loopedin-release-test-'));
  t.after(() => {
    if (existsSync(temporary)) rmSync(temporary, { recursive: true, force: true });
  });
  const store = join(temporary, 'store');
  const releases = join(store, 'releases');
  const aliases = join(store, 'aliases');
  mkdirSync(aliases, { recursive: true });
  for (const [digest, release] of [['a'.repeat(64), 'baseline'], ['b'.repeat(64), 'candidate']]) {
    const root = join(releases, digest);
    mkdirSync(join(root, '_expo/static/js'), { recursive: true });
    writeFileSync(join(root, 'index.html'), `<main>${release}</main>`);
    writeFileSync(join(root, '_expo/static/js/index-abcdef12.js'), `globalThis.release=${JSON.stringify(release)}`);
  }
  const pointTo = (digest, releaseId) => writeFileSync(join(aliases, 'stable.json'), JSON.stringify({ artifactSha256: digest, releaseId }));
  pointTo('a'.repeat(64), 'baseline');

  const port = await reservePort();
  const child = spawn(process.execPath, [join(repositoryRoot, 'scripts/serve-web-release.mjs'), '--store', store, '--alias', 'stable', '--port', String(port)], {
    stdio: 'ignore',
    windowsHide: true,
  });
  t.after(async () => {
    if (!child.killed) child.kill();
    await Promise.race([once(child, 'exit'), new Promise((resolveWait) => setTimeout(resolveWait, 1000))]);
  });
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health/deep/link`);
      if (response.ok) break;
    } catch {}
    await new Promise((resolveWait) => setTimeout(resolveWait, 20));
  }

  const baseline = await fetch(`http://127.0.0.1:${port}/family/deep/link`);
  assert.equal(await baseline.text(), '<main>baseline</main>');
  assert.equal(baseline.headers.get('x-loopedin-release'), 'baseline');
  assert.equal(baseline.headers.get('cache-control'), 'no-cache');
  assert.match(baseline.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.equal(baseline.headers.get('x-content-type-options'), 'nosniff');

  const asset = await fetch(`http://127.0.0.1:${port}/_expo/static/js/index-abcdef12.js`);
  assert.equal(asset.headers.get('cache-control'), 'public, max-age=31536000, immutable');
  const rejected = await fetch(`http://127.0.0.1:${port}/event/exact-id`, { method: 'POST' });
  assert.equal(rejected.status, 405);

  pointTo('b'.repeat(64), 'candidate');
  const candidate = await fetch(`http://127.0.0.1:${port}/event/exact-id`);
  assert.equal(await candidate.text(), '<main>candidate</main>');
  assert.equal(candidate.headers.get('x-loopedin-release'), 'candidate');
});
