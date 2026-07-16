import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const EXPECTED_PROJECT_REF = 'vkogznsfthirhxkqysza';
const EXPECTED_URL = `https://${EXPECTED_PROJECT_REF}.supabase.co`;
const EXPECTED_ENVIRONMENT = 'loopedin-staging';
const ACKNOWLEDGEMENT = 'I_ACKNOWLEDGE_LOOPEDIN_STAGING_TELEMETRY';
const summaryKeys = [
  'checkedAt', 'distinctReleases', 'environment', 'lastHourAccess', 'lastHourConflict',
  'lastHourNetwork', 'lastHourRateLimit', 'lastHourRender', 'lastHourSession',
  'lastHourTotal', 'lastHourUnknown', 'purgedEvents', 'purgedRateLimits',
  'releaseCounts',
].sort();

function nonnegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

export function evaluateTelemetrySummary(summary, forceAlert = false) {
  assert.ok(summary && typeof summary === 'object' && !Array.isArray(summary), 'telemetry summary is invalid');
  assert.deepEqual(Object.keys(summary).sort(), summaryKeys, 'telemetry summary shape changed');
  assert.equal(summary.environment, EXPECTED_ENVIRONMENT, 'telemetry environment changed');
  assert.ok(Number.isFinite(Date.parse(summary.checkedAt)), 'telemetry check time is invalid');
  for (const key of summaryKeys.filter((key) => !['checkedAt', 'environment', 'releaseCounts'].includes(key))) {
    assert.ok(nonnegativeInteger(summary[key]), `${key} must be a nonnegative integer`);
  }
  assert.ok(summary.releaseCounts && typeof summary.releaseCounts === 'object' && !Array.isArray(summary.releaseCounts), 'release counts are invalid');
  for (const [release, count] of Object.entries(summary.releaseCounts)) {
    assert.match(release, /^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}-[0-9a-f]{12}$/, 'release count identity is invalid');
    assert.ok(nonnegativeInteger(count), 'release count must be a nonnegative integer');
  }
  assert.ok(summary.lastHourRender === 0, 'render-error alert threshold reached');
  assert.ok(summary.lastHourUnknown < 5, 'unknown-error alert threshold reached');
  assert.ok(summary.lastHourNetwork < 10, 'network-error alert threshold reached');
  assert.ok(summary.lastHourSession < 5, 'session-error alert threshold reached');
  assert.ok(summary.lastHourTotal < 20, 'total-error alert threshold reached');
  if (forceAlert) throw new Error('Controlled telemetry alert proof requested.');
  return summary;
}

async function main() {
  assert.equal(process.env.LOOPEDIN_TELEMETRY_STAGING_ACK, ACKNOWLEDGEMENT, 'staging telemetry acknowledgement is required');
  const secretKey = process.env.LOOPEDIN_STAGING_SUPABASE_SECRET_KEY;
  assert.match(secretKey ?? '', /^sb_secret_[A-Za-z0-9_-]+$/, 'dedicated staging secret key is required');
  const response = await fetch(`${EXPECTED_URL}/rest/v1/rpc/loopedin_maintain_client_error_telemetry`, {
    method: 'POST',
    headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
    body: '{}',
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Hosted telemetry maintenance failed (HTTP ${response.status}).`);
  const summary = evaluateTelemetrySummary(await response.json(), process.env.LOOPEDIN_FORCE_TELEMETRY_ALERT === 'true');
  console.log(JSON.stringify({ outcome: 'PASS', ...summary }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main();
  } catch (error) {
    console.error(`LoopedIn telemetry monitor failed: ${error instanceof Error ? error.message : 'unknown failure'}`);
    process.exitCode = 1;
  }
}
