import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { loadInvitationCandidate, verifyHostedInvitationCandidate } from '../scripts/hosted-invitation-release.mjs';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'loopedin-invitation-release-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const html = '<html><body>LoopedIn</body></html>';
  const sourceCommit = 'a'.repeat(40);
  const files = [{ path: 'index.html', bytes: Buffer.byteLength(html), sha256: sha256(html) }];
  const manifest = {
    schemaVersion: 2, appVersion: '0.1.0', dataMode: 'runtime', sourceCommit,
    sourceDateEpoch: 1, releaseId: `0.1.0-${sourceCommit.slice(0, 12)}`, files,
    artifactSha256: sha256(`schemaVersion=2\nappVersion=0.1.0\ndataMode=runtime\nsourceCommit=${sourceCommit}\nsourceDateEpoch=1\nindex.html\t${files[0].bytes}\t${files[0].sha256}\n`),
  };
  writeFileSync(join(directory, 'index.html'), html);
  writeFileSync(join(directory, 'release-manifest.json'), JSON.stringify(manifest));
  const options = { artifactPath: directory, sourceCommit, artifactSha256: manifest.artifactSha256, approvalReference: 'approval-test-only' };
  const requests = [];
  const responses = new Map([
    ['/', () => new Response(html, { headers: { 'x-loopedin-release': manifest.releaseId, 'x-loopedin-environment': 'loopedin-staging' } })],
    ['/release-manifest.json', () => Response.json(manifest)],
    ['/runtime-config.json', () => Response.json({ schemaVersion: 1, dataMode: 'supabase', environmentId: 'loopedin-staging', supabaseUrl: 'https://vkogznsfthirhxkqysza.supabase.co', supabasePublishableKey: 'sb_publishable_synthetic_test_only' }, { headers: { 'cache-control': 'no-store' } })],
    ['/index.html', () => new Response(html)],
  ]);
  const fetchImpl = async (url, options) => {
    const target = new URL(url);
    assert.equal(target.origin, 'https://loopedin-family.netlify.app');
    assert.equal(options.redirect, 'error');
    assert.ok(options.signal instanceof AbortSignal);
    requests.push(target.pathname);
    assert.ok(responses.has(target.pathname), 'unexpected network request');
    return responses.get(target.pathname)();
  };
  return { options, manifest, directory, html, responses, requests, fetchImpl };
}

test('invitation proof requires a trusted full source, digest, approval reference, and unchanged artifact', (t) => {
  const f = fixture(t);
  for (const field of ['sourceCommit', 'artifactSha256', 'approvalReference', 'artifactPath']) {
    assert.throws(() => loadInvitationCandidate({ ...f.options, [field]: undefined }));
  }
  assert.throws(() => loadInvitationCandidate({ ...f.options, sourceCommit: 'a'.repeat(12) }));
  assert.throws(() => loadInvitationCandidate({ ...f.options, sourceCommit: 'b'.repeat(40) }));
  assert.throws(() => loadInvitationCandidate({ ...f.options, approvalReference: 'private@example.com' }));
  assert.equal(loadInvitationCandidate(f.options).manifest.releaseId, f.manifest.releaseId);
  writeFileSync(join(f.directory, 'index.html'), 'changed');
  assert.throws(() => loadInvitationCandidate(f.options), /verification failed/);
});

test('hosted proof verifies source, artifact, runtime, and served payload bytes using read-only requests', async (t) => {
  const f = fixture(t);
  const result = await verifyHostedInvitationCandidate(loadInvitationCandidate(f.options), { fetchImpl: f.fetchImpl });
  assert.equal(result.sourceCommit, f.manifest.sourceCommit);
  assert.equal(result.artifactSha256, f.manifest.artifactSha256);
  assert.equal(result.verifiedFiles, 1);
  assert.deepEqual(f.requests, ['/', '/release-manifest.json', '/runtime-config.json', '/index.html']);
  assert.equal(JSON.stringify(result).includes('sb_publishable'), false);
});

test('stale release refuses further requests before any hosted fixture can be created', async (t) => {
  const f = fixture(t);
  f.responses.set('/', () => new Response(f.html, { headers: { 'x-loopedin-release': '0.1.0-bbbbbbbbbbbb', 'x-loopedin-environment': 'loopedin-staging' } }));
  await assert.rejects(verifyHostedInvitationCandidate(loadInvitationCandidate(f.options), { fetchImpl: f.fetchImpl }), /release identity mismatch/);
  assert.deepEqual(f.requests, ['/']);
});

test('matching release labels cannot hide substituted payload bytes', async (t) => {
  const f = fixture(t);
  f.responses.set('/index.html', () => new Response(f.html.replace('LoopedIn', 'Tampered')));
  await assert.rejects(verifyHostedInvitationCandidate(loadInvitationCandidate(f.options), { fetchImpl: f.fetchImpl }), /payload mismatch/);
});

test('the root document must match the artifact even when index.html is correct', async (t) => {
  const f = fixture(t);
  f.responses.set('/', () => new Response(f.html.replace('LoopedIn', 'Tampered'), { headers: { 'x-loopedin-release': f.manifest.releaseId, 'x-loopedin-environment': 'loopedin-staging' } }));
  await assert.rejects(verifyHostedInvitationCandidate(loadInvitationCandidate(f.options), { fetchImpl: f.fetchImpl }), /payload mismatch/);
  assert.deepEqual(f.requests, ['/']);
});

test('publishable key comparison uses the bounded runtime read without returning the key', async (t) => {
  const f = fixture(t);
  await assert.rejects(verifyHostedInvitationCandidate(loadInvitationCandidate(f.options), { fetchImpl: f.fetchImpl, expectedPublishableKey: 'sb_publishable_other' }), /runtime identity mismatch/);
  f.requests.length = 0;
  const result = await verifyHostedInvitationCandidate(loadInvitationCandidate(f.options), { fetchImpl: f.fetchImpl, expectedPublishableKey: 'sb_publishable_synthetic_test_only' });
  assert.equal(f.requests.filter((path) => path === '/runtime-config.json').length, 1);
  assert.equal(JSON.stringify(result).includes('sb_publishable'), false);
  f.responses.set('/runtime-config.json', () => new Response(' '.repeat(16_385), { headers: { 'cache-control': 'no-store' } }));
  await assert.rejects(verifyHostedInvitationCandidate(loadInvitationCandidate(f.options), { fetchImpl: f.fetchImpl, expectedPublishableKey: 'sb_publishable_synthetic_test_only' }), /byte limit/);
});

test('oversized hosted payload is rejected while streaming rather than accepted by its manifest', async (t) => {
  const f = fixture(t);
  f.responses.set('/index.html', () => new Response(`${f.html}extra`));
  await assert.rejects(verifyHostedInvitationCandidate(loadInvitationCandidate(f.options), { fetchImpl: f.fetchImpl }), /byte limit/);
});

test('an unavailable hosted payload cannot count as verified', async (t) => {
  const f = fixture(t);
  f.responses.set('/index.html', () => new Response('missing', { status: 404 }));
  await assert.rejects(verifyHostedInvitationCandidate(loadInvitationCandidate(f.options), { fetchImpl: f.fetchImpl }), /request failed/);
});

test('full commit mismatch is rejected even when the abbreviated release label matches', async (t) => {
  const f = fixture(t);
  f.responses.set('/release-manifest.json', () => Response.json({ ...f.manifest, sourceCommit: 'a'.repeat(12) + 'b'.repeat(28) }));
  await assert.rejects(verifyHostedInvitationCandidate(loadInvitationCandidate(f.options), { fetchImpl: f.fetchImpl }), /manifest mismatch/);
});

test('hosted proof rejects another backend and cacheable runtime configuration', async (t) => {
  const f = fixture(t);
  for (const changes of [{ supabaseUrl: 'https://lzscofbvecgpchokxhyb.supabase.co' }, { dataMode: 'local' }]) {
    f.responses.set('/runtime-config.json', () => Response.json({ schemaVersion: 1, dataMode: 'supabase', environmentId: 'loopedin-staging', supabaseUrl: 'https://vkogznsfthirhxkqysza.supabase.co', supabasePublishableKey: 'sb_publishable_synthetic_test_only', ...changes }, { headers: { 'cache-control': 'no-store' } }));
    await assert.rejects(verifyHostedInvitationCandidate(loadInvitationCandidate(f.options), { fetchImpl: f.fetchImpl }));
  }
  f.responses.set('/runtime-config.json', () => Response.json({}));
  await assert.rejects(verifyHostedInvitationCandidate(loadInvitationCandidate(f.options), { fetchImpl: f.fetchImpl }), /runtime cache/);
});
