import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync('supabase/migrations/20260716150236_invitation_email_delivery.sql', 'utf8');
const index = readFileSync('supabase/functions/send-group-invitation/index.ts', 'utf8');
const core = readFileSync('supabase/functions/send-group-invitation/core.mjs', 'utf8');
const deno = JSON.parse(readFileSync('supabase/functions/send-group-invitation/deno.json', 'utf8'));
const config = readFileSync('supabase/config.toml', 'utf8');

test('delivery ledger is private and excludes invitation contents and provider identifiers', () => {
  const table = migration.slice(migration.indexOf('create table loopedin_private.loopedin_invitation_email_deliveries'), migration.indexOf('create index loopedin_invitation_email_deliveries'));
  assert.match(table, /invitation_id uuid not null/);
  assert.match(table, /requested_by uuid not null/);
  assert.match(table, /operation_key uuid not null/);
  assert.doesNotMatch(table, /\b(email|token|body|url|provider_id)\b/i);
  assert.match(migration, /revoke all on loopedin_private\.loopedin_invitation_email_deliveries[\s\S]*?service_role/);
});

test('prepare and finalize enforce active owner and exact pending invitation checks', () => {
  for (const functionName of ['loopedin_prepare_invitation_email', 'loopedin_finalize_invitation_email']) {
    const start = migration.indexOf(`create function public.${functionName}`);
    const end = migration.indexOf('\n$$;', start) + 4;
    const body = migration.slice(start, end);
    assert.match(body, /require_active_account/);
    assert.match(body, /matching\.token_hash <> requested_hash/);
    assert.match(body, /matching\.status <> 'pending'/);
    assert.match(body, /matching\.expires_at <= now\(\)/);
    assert.match(body, /member\.role = 'owner'/);
  }
  assert.match(migration, /interval '60 seconds'/);
  assert.match(migration, /interval '24 hours'/);
  assert.match(migration, />= 5/);
  assert.match(migration, /status = 'prepared' and delivery\.last_attempt_at <= now\(\) - interval '24 hours'/);
  assert.match(migration, /'operator_review'/);
  assert.match(migration, /pg_advisory_xact_lock[\s\S]*?invitation-email-actor/);
  assert.match(migration, /pg_advisory_xact_lock[\s\S]*?invitation-email-group/);
  assert.match(migration, /sum\(item\.attempt_count\)[\s\S]*?item\.requested_by = actor_id/);
  assert.match(migration, /join public\.loopedin_group_invitations invitation[\s\S]*?invitation\.group_id = matching\.group_id/);
  assert.match(migration, /actor_attempts >= 20 or group_attempts >= 20/);
  assert.match(migration, /unique \(requested_by, operation_key\)/);
});

test('Edge Function is pinned, user-authenticated, exact-origin, and server-configured', () => {
  assert.equal(deno.imports['@supabase/server'], 'npm:@supabase/server@1.4.0');
  assert.match(config, /\[functions\.send-group-invitation\][\s\S]*?verify_jwt = true/);
  assert.match(index, /withSupabase\(\{ auth: "user"/);
  assert.match(index, /ctx\.supabase\.rpc\('loopedin_prepare_invitation_email'/);
  assert.match(index, /ctx\.supabase\.rpc\('loopedin_finalize_invitation_email'/);
  assert.match(index, /req\.headers\.get\('origin'\) !== appOrigin/);
  assert.match(index, /Deno\.env\.get\('LOOPEDIN_APP_ORIGIN'\)/);
  assert.match(index, /Deno\.env\.get\('RESEND_INVITATION_API_KEY'\)/);
  assert.match(index, /Deno\.env\.get\('RESEND_INVITATION_FROM'\)/);
  assert.match(core, /https:\/\/api\.resend\.com\/emails/);
  assert.doesNotMatch(index, /console\./);
});
