import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

const repositoryRoot = resolve(import.meta.dirname, '..');
const builder = join(repositoryRoot, 'scripts/build-netlify-deployment-envelope.mjs');
const verifier = join(repositoryRoot, 'scripts/verify-netlify-deployment-envelope.mjs');

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function writeArtifact(root) {
  const artifact = join(root, 'artifact');
  mkdirSync(join(artifact, '_expo/static/js'), { recursive: true });
  writeFileSync(join(artifact, 'index.html'), '<main>LoopedIn</main>\n');
  writeFileSync(join(artifact, '_expo/static/js/index-abcdef12.js'), 'globalThis.loopedIn=true;\n');
  const files = [
    ['_expo/static/js/index-abcdef12.js', 'globalThis.loopedIn=true;\n'],
    ['index.html', '<main>LoopedIn</main>\n'],
  ].map(([path, contents]) => ({ path, bytes: Buffer.byteLength(contents), sha256: sha256(contents) }));
  const sourceCommit = 'a'.repeat(40);
  const canonical = `schemaVersion=2\nappVersion=0.1.0\ndataMode=runtime\nsourceCommit=${sourceCommit}\nsourceDateEpoch=1784070000\n${files.map((file) => `${file.path}\t${file.bytes}\t${file.sha256}`).join('\n')}\n`;
  const manifest = {
    schemaVersion: 2,
    releaseId: `0.1.0-${sourceCommit.slice(0, 12)}`,
    appVersion: '0.1.0',
    dataMode: 'runtime',
    sourceCommit,
    sourceDateEpoch: 1784070000,
    artifactSha256: sha256(canonical),
    files,
  };
  writeFileSync(join(artifact, 'release-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return { artifact, manifest };
}

function writeRuntimeConfig(root, overrides = {}) {
  const path = join(root, 'runtime-config.json');
  writeFileSync(path, `${JSON.stringify({
    schemaVersion: 1,
    environmentId: 'loopedin-staging',
    dataMode: 'supabase',
    supabaseUrl: 'https://loopedin-staging.supabase.co',
    supabasePublishableKey: `sb_publishable_${'a'.repeat(24)}`,
    ...overrides,
  })}\n`);
  return path;
}

function builderArgs(artifact, runtimeConfig, envelope, manifest) {
  return [builder,
    '--artifact', artifact,
    '--runtime-config', runtimeConfig,
    '--output', envelope,
    '--expected-artifact-sha256', manifest.artifactSha256,
    '--expected-source-commit', manifest.sourceCommit,
  ];
}

test('builds and verifies a target-neutral static Netlify publish envelope from one immutable artifact', (t) => {
  const temporary = mkdtempSync(join(tmpdir(), 'loopedin-hosted-release-'));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const { artifact, manifest } = writeArtifact(temporary);
  const runtimeConfig = writeRuntimeConfig(temporary);
  const envelope = join(temporary, 'envelope');

  execFileSync(process.execPath, builderArgs(artifact, runtimeConfig, envelope, manifest), { encoding: 'utf8' });
  execFileSync(process.execPath, [verifier, '--envelope', envelope, '--expected-artifact-sha256', manifest.artifactSha256, '--expected-source-commit', manifest.sourceCommit], { encoding: 'utf8' });

  assert.equal(readFileSync(join(envelope, 'index.html'), 'utf8'), '<main>LoopedIn</main>\n');
  assert.deepEqual(JSON.parse(readFileSync(join(envelope, 'runtime-config.json'), 'utf8')), JSON.parse(readFileSync(runtimeConfig, 'utf8')));
  const headers = readFileSync(join(envelope, '_headers'), 'utf8');
  const redirects = readFileSync(join(envelope, '_redirects'), 'utf8');
  assert.doesNotMatch(`${headers}\n${redirects}`, /projectId|orgId|function|buildCommand|installCommand|secret|service.role/i);
  assert.match(headers, /connect-src 'self' https:\/\/loopedin-staging\.supabase\.co wss:\/\/loopedin-staging\.supabase\.co/);
  assert.match(headers, /img-src 'self' data: blob: https: https:\/\/loopedin-staging\.supabase\.co/);
  assert.match(headers, /\/runtime-config\.json\n  Cache-Control: no-store/);
  assert.match(headers, /\/\n  Cache-Control: no-cache\n  Netlify-CDN-Cache-Control: no-cache/);
  assert.match(headers, /\/_expo\/static\/js\/index-abcdef12\.js\n  Cache-Control: public, max-age=31536000, immutable/);
  assert.match(headers, /\/index\.html\n  Cache-Control: no-cache/);
  assert.doesNotMatch(headers, /\/_expo\/static\/\*\n  Cache-Control: public/);
  assert.equal(redirects, '# LoopedIn uses hash routes; no catch-all rewrite is needed, so missing assets remain 404.\n');
  assert.doesNotMatch(redirects, /^\/\*/m);
  const deployment = JSON.parse(readFileSync(join(envelope, 'deployment-envelope.json'), 'utf8'));
  assert.equal(deployment.artifactSha256, manifest.artifactSha256);
  assert.equal(deployment.sourceCommit, manifest.sourceCommit);
  assert.equal(deployment.environmentId, 'loopedin-staging');
  assert.match(deployment.runtimeConfigSha256, /^[0-9a-f]{64}$/);
  assert.match(deployment.headersSha256, /^[0-9a-f]{64}$/);
  assert.match(deployment.redirectsSha256, /^[0-9a-f]{64}$/);
});

test('rejects drifted Netlify headers and redirects', (t) => {
  const temporary = mkdtempSync(join(tmpdir(), 'loopedin-hosted-release-'));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const { artifact, manifest } = writeArtifact(temporary);
  const runtimeConfig = writeRuntimeConfig(temporary);
  const envelope = join(temporary, 'envelope');
  execFileSync(process.execPath, builderArgs(artifact, runtimeConfig, envelope, manifest), { encoding: 'utf8' });

  writeFileSync(join(envelope, '_headers'), '/*\n  Cache-Control: public\n');
  const headersResult = spawnSync(process.execPath, [verifier, '--envelope', envelope, '--expected-artifact-sha256', manifest.artifactSha256, '--expected-source-commit', manifest.sourceCommit], { encoding: 'utf8' });
  assert.notEqual(headersResult.status, 0);
  assert.match(headersResult.stderr, /Netlify headers/i);

  execFileSync(process.execPath, builderArgs(artifact, runtimeConfig, join(temporary, 'second-envelope'), manifest), { encoding: 'utf8' });
  writeFileSync(join(temporary, 'second-envelope', '_redirects'), '/* /index.html 200\n');
  const redirectsResult = spawnSync(process.execPath, [verifier, '--envelope', join(temporary, 'second-envelope'), '--expected-artifact-sha256', manifest.artifactSha256, '--expected-source-commit', manifest.sourceCommit], { encoding: 'utf8' });
  assert.notEqual(redirectsResult.status, 0);
  assert.match(redirectsResult.stderr, /Netlify redirects/i);
});

test('rejects tampered artifact bytes without publishing a deployment envelope', (t) => {
  const temporary = mkdtempSync(join(tmpdir(), 'loopedin-hosted-release-'));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const { artifact, manifest } = writeArtifact(temporary);
  const runtimeConfig = writeRuntimeConfig(temporary);
  const envelope = join(temporary, 'envelope');
  writeFileSync(join(artifact, 'index.html'), '<main>tampered</main>\n');

  const result = spawnSync(process.execPath, builderArgs(artifact, runtimeConfig, envelope, manifest), { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /artifact verification failed/i);
  assert.equal(existsSync(envelope), false);
});

test('rejects an unmanifested symbolic link without publishing a deployment envelope', (t) => {
  const temporary = mkdtempSync(join(tmpdir(), 'loopedin-hosted-release-'));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const { artifact, manifest } = writeArtifact(temporary);
  const runtimeConfig = writeRuntimeConfig(temporary);
  const envelope = join(temporary, 'envelope');
  try {
    symlinkSync(join(artifact, 'index.html'), join(artifact, 'unexpected-link.html'), 'file');
  } catch (error) {
    t.skip(`Symbolic links are unavailable: ${error.code}`);
    return;
  }

  const result = spawnSync(process.execPath, builderArgs(artifact, runtimeConfig, envelope, manifest), { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unsupported filesystem entry/i);
  assert.equal(existsSync(envelope), false);
});

test('rejects secret-like runtime configuration without publishing a deployment envelope', (t) => {
  const temporary = mkdtempSync(join(tmpdir(), 'loopedin-hosted-release-'));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const { artifact, manifest } = writeArtifact(temporary);
  const runtimeConfig = writeRuntimeConfig(temporary, { supabasePublishableKey: 'sb_secret_do-not-deploy' });
  const envelope = join(temporary, 'envelope');

  const result = spawnSync(process.execPath, builderArgs(artifact, runtimeConfig, envelope, manifest), { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /runtime config key is invalid/i);
  assert.equal(existsSync(envelope), false);
});

test('rejects a non-string environment identity without publishing a deployment envelope', (t) => {
  const temporary = mkdtempSync(join(tmpdir(), 'loopedin-hosted-release-'));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const { artifact, manifest } = writeArtifact(temporary);
  const runtimeConfig = writeRuntimeConfig(temporary, { environmentId: 123 });
  const envelope = join(temporary, 'envelope');

  const result = spawnSync(process.execPath, builderArgs(artifact, runtimeConfig, envelope, manifest), { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /runtime config identity is invalid/i);
  assert.equal(existsSync(envelope), false);
});

test('requires the trusted CI artifact digest and source commit', (t) => {
  const temporary = mkdtempSync(join(tmpdir(), 'loopedin-hosted-release-'));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const { artifact, manifest } = writeArtifact(temporary);
  const runtimeConfig = writeRuntimeConfig(temporary);
  const envelope = join(temporary, 'envelope');

  const missing = spawnSync(process.execPath, [builder, '--artifact', artifact, '--runtime-config', runtimeConfig, '--output', envelope], { encoding: 'utf8' });
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /expected-artifact-sha256/);
  const mismatched = spawnSync(process.execPath, builderArgs(artifact, runtimeConfig, envelope, { ...manifest, artifactSha256: 'f'.repeat(64) }), { encoding: 'utf8' });
  assert.notEqual(mismatched.status, 0);
  assert.match(mismatched.stderr, /trusted CI artifact digest/i);
  assert.equal(existsSync(envelope), false);
});

test('rejects invalid manifest identity even when its internal digest is self-consistent', (t) => {
  const temporary = mkdtempSync(join(tmpdir(), 'loopedin-hosted-release-'));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const { artifact, manifest } = writeArtifact(temporary);
  const runtimeConfig = writeRuntimeConfig(temporary);
  const envelope = join(temporary, 'envelope');
  const ambiguous = { ...manifest, releaseId: 'unrelated' };
  const canonicalFiles = ambiguous.files.map((file) => `${file.path}\t${file.bytes}\t${file.sha256}`).join('\n');
  ambiguous.artifactSha256 = sha256(`schemaVersion=2\nappVersion=${ambiguous.appVersion}\ndataMode=runtime\nsourceCommit=${ambiguous.sourceCommit}\nsourceDateEpoch=${ambiguous.sourceDateEpoch}\n${canonicalFiles}\n`);
  writeFileSync(join(artifact, 'release-manifest.json'), `${JSON.stringify(ambiguous, null, 2)}\n`);

  const result = spawnSync(process.execPath, builderArgs(artifact, runtimeConfig, envelope, ambiguous), { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /manifest is invalid or unsupported/i);
  assert.equal(existsSync(envelope), false);
});

test('rejects duplicate manifest paths even when its internal digest is self-consistent', (t) => {
  const temporary = mkdtempSync(join(tmpdir(), 'loopedin-hosted-release-'));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const { artifact, manifest } = writeArtifact(temporary);
  const runtimeConfig = writeRuntimeConfig(temporary);
  const envelope = join(temporary, 'envelope');
  const duplicate = { ...manifest, files: [...manifest.files, manifest.files[0]] };
  const canonicalFiles = duplicate.files.map((file) => `${file.path}\t${file.bytes}\t${file.sha256}`).join('\n');
  duplicate.artifactSha256 = sha256(`schemaVersion=2\nappVersion=${duplicate.appVersion}\ndataMode=runtime\nsourceCommit=${duplicate.sourceCommit}\nsourceDateEpoch=${duplicate.sourceDateEpoch}\n${canonicalFiles}\n`);
  writeFileSync(join(artifact, 'release-manifest.json'), `${JSON.stringify(duplicate, null, 2)}\n`);

  const result = spawnSync(process.execPath, builderArgs(artifact, runtimeConfig, envelope, duplicate), { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /duplicate artifact path/i);
  assert.equal(existsSync(envelope), false);
});

test('CI builds the exact event head once and uploads it without deployment credentials or remotes', () => {
  const workflow = readFileSync(join(repositoryRoot, '.github/workflows/ci.yml'), 'utf8').replace(/\r\n/g, '\n');
  const job = workflow.match(/  release-artifact:\n([\s\S]*?)(?=\n  [a-z][a-z-]+:\n|$)/)?.[0] ?? '';
  assert.notEqual(job, '', 'release-artifact job must exist');
  assert.match(job, /ref: \$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/);
  assert.match(job, /SourceRevision .*SOURCE_REVISION/);
  assert.equal((job.match(/build-web-release\.ps1/g) ?? []).length, 1);
  assert.match(job, /artifact_sha256/);
  assert.match(job, /actions\/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02/);
  assert.doesNotMatch(job, /secrets\.|service.role|SUPABASE_|vercel|netlify|run:.*deploy|db push/i);
  assert.equal((workflow.match(/ref: \$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/g) ?? []).length, 4);
});
