import assert from 'node:assert/strict';

const EXPECTED_ORIGIN = 'https://loopedin-family.netlify.app';
const EXPECTED_PROJECT_REF = 'vkogznsfthirhxkqysza';
const EXPECTED_BACKEND = `https://${EXPECTED_PROJECT_REF}.supabase.co`;
const EXPECTED_ENVIRONMENT = 'loopedin-staging';
const TIMEOUT_MS = 15_000;

const origin = process.env.LOOPEDIN_AVAILABILITY_ORIGIN ?? EXPECTED_ORIGIN;
assert.equal(origin, EXPECTED_ORIGIN, 'availability target must be the dedicated LoopedIn staging alias');

async function timedFetch(target, options = {}) {
  const started = performance.now();
  const response = await fetch(target, { ...options, redirect: 'error', signal: AbortSignal.timeout(TIMEOUT_MS) });
  return { response, latencyMs: Math.round(performance.now() - started) };
}

function cacheTokens(response) {
  return (response.headers.get('cache-control') ?? '').toLowerCase().split(',').map((token) => token.trim());
}

async function main() {
  const shell = await timedFetch(`${origin}/`);
  assert.equal(shell.response.status, 200, 'hosted shell unavailable');
  assert.ok(cacheTokens(shell.response).some((token) => token === 'no-cache' || token === 'max-age=0'), 'hosted shell cache policy changed');
  const html = await shell.response.text();
  assert.match(html, /<div id="root"><\/div>/, 'hosted shell root missing');

  const runtime = await timedFetch(`${origin}/runtime-config.json`, { cache: 'no-store' });
  assert.equal(runtime.response.status, 200, 'runtime configuration unavailable');
  assert.ok(cacheTokens(runtime.response).includes('no-store'), 'runtime configuration is cacheable');
  const config = await runtime.response.json();
  assert.deepEqual(Object.keys(config).sort(), ['schemaVersion', 'dataMode', 'environmentId', 'supabasePublishableKey', 'supabaseUrl'].sort(), 'runtime configuration shape changed');
  assert.equal(config.schemaVersion, 1, 'runtime configuration schema changed');
  assert.equal(config.environmentId, EXPECTED_ENVIRONMENT, 'runtime environment changed');
  assert.equal(config.dataMode, 'supabase', 'runtime data mode changed');
  assert.equal(config.supabaseUrl, EXPECTED_BACKEND, 'runtime backend changed');
  assert.match(config.supabasePublishableKey, /^sb_publishable_[A-Za-z0-9_-]+$/, 'runtime publishable key is invalid');

  const csp = shell.response.headers.get('content-security-policy') ?? '';
  assert.match(csp, new RegExp(`connect-src[^;]*${EXPECTED_BACKEND.replaceAll('.', '\\.')}[^;]*wss://${EXPECTED_PROJECT_REF}\\.supabase\\.co`), 'hosted backend CSP changed');
  assert.equal(shell.response.headers.get('x-content-type-options'), 'nosniff', 'nosniff header missing');
  assert.ok(shell.response.headers.get('strict-transport-security'), 'HSTS header missing');

  const auth = await timedFetch(`${EXPECTED_BACKEND}/auth/v1/health`, {
    headers: { apikey: config.supabasePublishableKey },
  });
  assert.equal(auth.response.status, 200, 'Supabase Auth health unavailable');

  const missing = await timedFetch(`${origin}/availability-check-missing-${Date.now()}.js`);
  assert.equal(missing.response.status, 404, 'missing static asset no longer returns 404');

  const release = shell.response.headers.get('x-loopedin-release');
  assert.match(release ?? '', /^0\.1\.0-[0-9a-f]{12}$/, 'release identity header missing');
  console.log(JSON.stringify({
    outcome: 'PASS', checkedAt: new Date().toISOString(), origin, environment: EXPECTED_ENVIRONMENT,
    release, shellMs: shell.latencyMs, runtimeMs: runtime.latencyMs, authMs: auth.latencyMs,
    shellStatus: shell.response.status, runtimeStatus: runtime.response.status,
    authStatus: auth.response.status, missingAssetStatus: missing.response.status,
  }));
}

try {
  await main();
} catch (error) {
  console.error(`LoopedIn availability check failed: ${error instanceof Error ? error.message : 'unknown failure'}`);
  process.exitCode = 1;
}
