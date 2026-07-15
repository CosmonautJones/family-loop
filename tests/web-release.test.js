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

test('release build contract pins one runtime-configured artifact and disables dotenv/backend inheritance', () => {
  const build = readFileSync(join(repositoryRoot, 'scripts/build-web-release.ps1'), 'utf8');
  const promote = readFileSync(join(repositoryRoot, 'scripts/promote-web-release.ps1'), 'utf8');
  assert.match(build, /git -C \$repositoryRoot archive[\s\S]*\$sourceCommit/);
  assert.match(build, /EXPO_NO_DOTENV', '1'/);
  assert.match(build, /EXPO_PUBLIC_DATA_MODE', 'runtime'/);
  for (const name of ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY', 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY']) {
    assert.match(build, new RegExp(`Remove-Item Env:${name}`));
  }
  assert.match(build, /ls-tree -r --name-only[\s\S]*\.env/);
  assert.match(build, /Sort-Object[\s\S]*Get-FileHash[\s\S]*artifactSha256/);
  assert.ok(build.includes(".Replace('\\', '/')"), 'manifest paths must use portable forward slashes');
  assert.ok(promote.includes(".Replace('\\', '/')"), 'promotion verification must use the same portable paths');
  assert.match(build, /WaitForExit\(\$TimeoutSeconds \* 1000\)/);
  assert.doesNotMatch(build, /Start-Process[\s\S]{0,300}-WindowStyle/);
  assert.match(build, /if \(\$onWindows\) \{\s*\$startProcessArguments\.WindowStyle = 'Hidden'/);
  assert.match(build, /Invoke-BoundedProcess[\s\S]*300 'npm-ci'[\s\S]*300 'expo-export'/);
  assert.doesNotMatch(build, /Get-Date|generatedAt/);
  assert.doesNotMatch(build, /environmentId=\$EnvironmentId|releaseId = .*EnvironmentId/);
  assert.match(build, /dataMode = 'runtime'/);
  assert.match(promote, /schemaVersion -notin @\(1, 2\)/);
  assert.match(promote, /schemaVersion -eq 2[\s\S]*dataMode -ne 'runtime'/);
});

test('web bootstrap validates external configuration before creating application services', () => {
  const entry = readFileSync(join(repositoryRoot, 'app/index.ts'), 'utf8');
  const runtime = readFileSync(join(repositoryRoot, 'app/src/config/runtimeConfig.ts'), 'utf8');
  assert.match(entry, /initializeRuntimeConfig\(\)[\s\S]*setReady\(true\)/);
  assert.match(entry, /accessibilityRole: 'alert'/);
  const services = readFileSync(join(repositoryRoot, 'app/src/services/index.ts'), 'utf8');
  assert.match(services, /new Proxy\([\s\S]*getService\(\)\[property\]/);
  assert.match(runtime, /fetch\('\/runtime-config\.json', \{ cache: 'no-store', credentials: 'same-origin' \}\)/);
  assert.match(runtime, /Object\.keys\(value\).*unsupported field/);
  assert.match(runtime, /url\.protocol === 'https:'[\s\S]*loopback/);
  assert.match(runtime, /sb_secret_[\s\S]*service\[_-\]\?role/);
  assert.doesNotMatch(runtime, /console\.|JSON\.stringify\(runtimeConfig/);
});

test('release preview swaps aliases while retaining SPA, security, and cache contracts', async (t) => {
  const temporary = mkdtempSync(join(tmpdir(), 'loopedin-release-test-'));
  t.after(() => {
    if (existsSync(temporary)) rmSync(temporary, { recursive: true, force: true });
  });
  const store = join(temporary, 'store');
  const releases = join(store, 'releases');
  const aliases = join(store, 'aliases');
  const runtimeConfig = join(temporary, 'runtime-config.json');
  mkdirSync(aliases, { recursive: true });
  for (const [digest, release] of [['a'.repeat(64), 'baseline'], ['b'.repeat(64), 'candidate']]) {
    const root = join(releases, digest);
    mkdirSync(join(root, '_expo/static/js'), { recursive: true });
    writeFileSync(join(root, 'index.html'), `<main>${release}</main>`);
    writeFileSync(join(root, '_expo/static/js/index-abcdef12.js'), `globalThis.release=${JSON.stringify(release)}`);
  }
  const pointTo = (digest, releaseId) => writeFileSync(join(aliases, 'stable.json'), JSON.stringify({ artifactSha256: digest, releaseId }));
  pointTo('a'.repeat(64), 'baseline');
  writeFileSync(runtimeConfig, JSON.stringify({ schemaVersion: 1, environmentId: 'rehearsal-local', dataMode: 'local' }));

  const port = await reservePort();
  const child = spawn(process.execPath, [join(repositoryRoot, 'scripts/serve-web-release.mjs'), '--store', store, '--runtime-config', runtimeConfig, '--alias', 'stable', '--port', String(port)], {
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
  assert.equal(baseline.headers.get('x-loopedin-environment'), 'rehearsal-local');
  assert.match(baseline.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.equal(baseline.headers.get('x-content-type-options'), 'nosniff');

  const asset = await fetch(`http://127.0.0.1:${port}/_expo/static/js/index-abcdef12.js`);
  assert.equal(asset.headers.get('cache-control'), 'public, max-age=31536000, immutable');
  const rejected = await fetch(`http://127.0.0.1:${port}/event/exact-id`, { method: 'POST' });
  assert.equal(rejected.status, 405);

  const configResponse = await fetch(`http://127.0.0.1:${port}/runtime-config.json`);
  assert.equal(configResponse.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await configResponse.json(), { schemaVersion: 1, environmentId: 'rehearsal-local', dataMode: 'local' });

  writeFileSync(runtimeConfig, JSON.stringify({
    schemaVersion: 1,
    environmentId: 'rehearsal-supabase',
    dataMode: 'supabase',
    supabaseUrl: 'http://127.0.0.1:54321',
    supabasePublishableKey: `sb_publishable_${'a'.repeat(24)}`,
  }));
  const configured = await fetch(`http://127.0.0.1:${port}/event/exact-id`);
  assert.equal(configured.headers.get('x-loopedin-environment'), 'rehearsal-supabase');
  const configuredPolicy = configured.headers.get('content-security-policy');
  assert.match(configuredPolicy, /connect-src 'self' http:\/\/127\.0\.0\.1:54321 ws:\/\/127\.0\.0\.1:54321/);
  assert.match(configuredPolicy, /img-src 'self' data: blob: https: http:\/\/127\.0\.0\.1:54321/);
  assert.doesNotMatch(configuredPolicy, /http:\/\/192\.0\.2\.1/);

  pointTo('b'.repeat(64), 'candidate');
  const candidate = await fetch(`http://127.0.0.1:${port}/event/exact-id`);
  assert.equal(await candidate.text(), '<main>candidate</main>');
  assert.equal(candidate.headers.get('x-loopedin-release'), 'candidate');

  writeFileSync(runtimeConfig, JSON.stringify({ schemaVersion: 1, environmentId: 'bad', dataMode: 'supabase', supabaseUrl: 'https://example.test', supabasePublishableKey: 'sb_secret_do-not-use' }));
  const invalidConfig = await fetch(`http://127.0.0.1:${port}/runtime-config.json`);
  assert.equal(invalidConfig.status, 503);
  assert.equal(invalidConfig.headers.get('cache-control'), 'no-store');
  const failClosedShell = await fetch(`http://127.0.0.1:${port}/`);
  assert.equal(failClosedShell.status, 200);
  assert.equal(failClosedShell.headers.get('x-loopedin-environment'), 'unavailable');
  assert.doesNotMatch(failClosedShell.headers.get('content-security-policy'), /example\.test/);
});
