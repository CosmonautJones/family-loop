import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { evaluateTelemetrySummary } from '../scripts/maintain-hosted-error-telemetry.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function summary(overrides = {}) {
  return {
    checkedAt: '2026-07-16T01:00:00.000Z', distinctReleases: 1, environment: 'loopedin-staging',
    lastHourAccess: 0, lastHourConflict: 0, lastHourNetwork: 0, lastHourRateLimit: 0,
    lastHourRender: 0, lastHourSession: 0, lastHourTotal: 0, lastHourUnknown: 0,
    purgedEvents: 0, purgedRateLimits: 0, releaseCounts: { '0.1.0-123456789abc': 0 }, ...overrides,
  };
}

test('telemetry operations accept only aggregate safe fields and enforce alerts', () => {
  assert.deepEqual(evaluateTelemetrySummary(summary()), summary());
  assert.throws(() => evaluateTelemetrySummary(summary({ lastHourRender: 1 })), /render-error alert/);
  assert.throws(() => evaluateTelemetrySummary(summary(), true), /Controlled telemetry alert proof/);
  assert.throws(() => evaluateTelemetrySummary({ ...summary(), message: 'not allowed' }), /shape changed/);
});

test('telemetry workflow is manual-only, least-privilege, staging-scoped, and secret-safe', () => {
  const workflow = fs.readFileSync(path.join(repoRoot, '.github', 'workflows', 'telemetry-operations.yml'), 'utf8');
  const script = fs.readFileSync(path.join(repoRoot, 'scripts', 'maintain-hosted-error-telemetry.mjs'), 'utf8');
  assert.doesNotMatch(workflow, /schedule:/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /environment: loopedin-staging-operations/);
  assert.match(workflow, /permissions:\r?\n  contents: read/);
  assert.match(workflow, /LOOPEDIN_STAGING_SUPABASE_SECRET_KEY: \$\{\{ secrets\.LOOPEDIN_STAGING_SUPABASE_SECRET_KEY \}\}/);
  assert.doesNotMatch(workflow, /LOOPEDIN_STAGING_DB_PASSWORD|LOOPEDIN_BACKUP_PASSPHRASE/);
  assert.match(script, /vkogznsfthirhxkqysza/);
  assert.doesNotMatch(script, /lzscofbvecgpchokxhyb|email|event title|comment|media path|stack trace|session replay/i);
});

test('hosted telemetry proof is dedicated, synthetic, bounded, and residue-safe', () => {
  const proof = fs.readFileSync(path.join(repoRoot, 'scripts', 'prove-hosted-error-telemetry.mjs'), 'utf8');
  const wrapper = fs.readFileSync(path.join(repoRoot, 'scripts', 'prove-hosted-error-telemetry.ps1'), 'utf8');
  for (const source of [proof, wrapper]) {
    assert.match(source, /vkogznsfthirhxkqysza/);
    assert.doesNotMatch(source, /travisjohn\.jones@gmail\.com|Jones Fam/);
  }
  assert.match(wrapper, /lzscofbvecgpchokxhyb/);
  assert.match(wrapper, /AcknowledgeStagingOnly/);
  assert.match(proof, /\[true, true, true, true, true, false\]/);
  assert.match(proof, /admin\.auth\.admin\.deleteUser/);
  assert.match(proof, /anonymous telemetry ingestion was not denied/);
  assert.doesNotMatch(proof, /console\.log\([^)]*(?:email|password|secretKey|userId)/);
});
