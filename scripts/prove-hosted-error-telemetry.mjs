import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../app/package.json', import.meta.url));
const { createClient } = require('@supabase/supabase-js');
const EXPECTED_PROJECT_REF = 'vkogznsfthirhxkqysza';
const EXPECTED_URL = `https://${EXPECTED_PROJECT_REF}.supabase.co`;

const url = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const release = process.env.LOOPEDIN_TELEMETRY_RELEASE;

assert.equal(process.env.LOOPEDIN_TELEMETRY_STAGING_ACK, 'I_ACKNOWLEDGE_LOOPEDIN_STAGING_TELEMETRY');
assert.equal(url, EXPECTED_URL, 'unexpected hosted project');
assert.match(publishableKey ?? '', /^sb_publishable_[A-Za-z0-9_-]+$/, 'publishable key required');
assert.match(secretKey ?? '', /^sb_secret_[A-Za-z0-9_-]+$/, 'secret key required');
assert.match(release ?? '', /^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}-[0-9a-f]{12}$/, 'release identity required');

const admin = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
const browser = createClient(url, publishableKey, { auth: { autoRefreshToken: false, persistSession: false } });
const suffix = crypto.randomBytes(12).toString('hex');
const email = `loopedin-telemetry-${suffix}@loopedin.invalid`;
const password = `${crypto.randomBytes(36).toString('base64url')}Aa1!`;
let userId;
let evidence;

async function maintenance() {
  const { data, error } = await admin.rpc('loopedin_maintain_client_error_telemetry');
  if (error) throw new Error('hosted telemetry maintenance RPC failed');
  return data;
}

try {
  const created = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    app_metadata: { loopedin_telemetry_proof: true },
    user_metadata: { display_name: 'LoopedIn telemetry proof' },
  });
  if (created.error || !created.data.user) throw new Error('synthetic telemetry identity creation failed');
  userId = created.data.user.id;

  const signedIn = await browser.auth.signInWithPassword({ email, password });
  if (signedIn.error || !signedIn.data.session) throw new Error('synthetic telemetry sign-in failed');

  const anonResponse = await fetch(`${url}/rest/v1/rpc/loopedin_report_client_error`, {
    method: 'POST', headers: { apikey: publishableKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ target_operation: 'data', target_category: 'conflict', target_release: release }),
  });
  assert.ok([401, 403].includes(anonResponse.status), 'anonymous telemetry ingestion was not denied');

  const before = await maintenance();
  const invalidRelease = await browser.rpc('loopedin_report_client_error', {
    target_operation: 'data', target_category: 'conflict', target_release: 'invalid',
  });
  assert.ifError(invalidRelease.error);
  assert.equal(invalidRelease.data, false, 'invalid release was accepted');
  const invalidPair = await browser.rpc('loopedin_report_client_error', {
    target_operation: 'render', target_category: 'network', target_release: release,
  });
  assert.ifError(invalidPair.error);
  assert.equal(invalidPair.data, false, 'invalid operation/category pair was accepted');

  const accepted = [];
  for (let index = 0; index < 6; index += 1) {
    const result = await browser.rpc('loopedin_report_client_error', {
      target_operation: 'data', target_category: 'conflict', target_release: release,
    });
    if (result.error) throw new Error('authenticated telemetry ingestion failed');
    accepted.push(result.data);
  }
  assert.deepEqual(accepted, [true, true, true, true, true, false], 'telemetry abuse bound changed');

  const after = await maintenance();
  assert.equal(after.environment, 'loopedin-staging', 'server-derived telemetry environment changed');
  const totalDelta = after.lastHourTotal - before.lastHourTotal;
  const conflictDelta = after.lastHourConflict - before.lastHourConflict;
  const releaseDelta = (after.releaseCounts?.[release] ?? 0) - (before.releaseCounts?.[release] ?? 0);
  assert.ok(totalDelta >= 5, 'telemetry total delta mismatch');
  assert.ok(conflictDelta >= 5, 'telemetry category delta mismatch');
  assert.ok(releaseDelta >= 5, 'telemetry release delta mismatch');

  evidence = {
    outcome: 'PASS', environment: after.environment, release, acceptedReports: 5,
    rateLimited: true, anonDenied: true, invalidPayloadsDenied: true,
    totalDelta, conflictDelta, releaseDelta,
  };
} finally {
  await browser.auth.signOut().catch(() => undefined);
  if (userId) {
    const deleted = await admin.auth.admin.deleteUser(userId);
    if (deleted.error) throw new Error('synthetic telemetry identity cleanup failed');
  }
  userId = undefined;
}

console.log(JSON.stringify(evidence));
