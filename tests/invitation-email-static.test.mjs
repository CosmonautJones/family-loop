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

test('prepare and service-only finalize enforce active owner and exact pending invitation checks', () => {
  const prepareStart = migration.indexOf('create function public.loopedin_prepare_invitation_email');
  const finalizeStart = migration.indexOf('create function public.loopedin_finalize_invitation_email');
  const prepareBody = migration.slice(prepareStart, migration.indexOf('\n$$;', prepareStart) + 4);
  const finalizeBody = migration.slice(finalizeStart, migration.indexOf('\n$$;', finalizeStart) + 4);
  assert.match(prepareBody, /require_active_account/);
  for (const body of [prepareBody, finalizeBody]) {
    assert.match(body, /matching\.token_hash <> requested_hash/);
    assert.match(body, /matching\.status <> 'pending'/);
    assert.match(body, /matching\.expires_at <= now\(\)/);
    assert.match(body, /member\.role = 'owner'/);
  }
  assert.match(finalizeBody, /request\.user_id = target_requested_by and request\.status = 'pending'/);
  assert.match(finalizeBody, /item\.requested_by = target_requested_by/);
  assert.match(finalizeBody, /pg_advisory_xact_lock\(pg_catalog\.hashtextextended\(target_requested_by::text, 0\)\)/);
  assert.match(migration, /interval '60 seconds'/);
  assert.match(migration, /interval '24 hours'/);
  assert.match(migration, />= 5/);
  assert.match(migration, /status = 'prepared' and delivery\.last_attempt_at <= now\(\) - interval '24 hours'/);
  assert.match(migration, /'operator_review'/);
  assert.match(migration, /delivery\.status in \('prepared', 'provider_failed'\)[\s\S]*?interval '60 seconds'[\s\S]*?delivery\.attempt_count >= 5[\s\S]*?attempt_count = case[\s\S]*?attempt_count \+ 1/);
  assert.match(migration, /pg_advisory_xact_lock[\s\S]*?invitation-email-actor/);
  assert.match(migration, /pg_advisory_xact_lock[\s\S]*?invitation-email-group/);
  assert.match(migration, /sum\(item\.attempt_count\)[\s\S]*?item\.requested_by = actor_id/);
  assert.match(migration, /join public\.loopedin_group_invitations invitation[\s\S]*?invitation\.group_id = matching\.group_id/);
  assert.match(migration, /actor_attempts >= 20 or group_attempts >= 20/);
  assert.match(migration, /unique \(requested_by, operation_key\)/);
  assert.match(migration, /revoke all on function public\.loopedin_finalize_invitation_email\(uuid, uuid, text, text\) from public, anon, authenticated/);
  assert.match(migration, /grant execute on function public\.loopedin_finalize_invitation_email\(uuid, uuid, text, text\) to service_role/);
  assert.doesNotMatch(migration, /grant execute on function public\.loopedin_finalize_invitation_email[^\n]*to authenticated/);
});

test('Edge Function is pinned, user-authenticated, exact-origin, and server-configured', () => {
  assert.equal(deno.imports['@supabase/server'], 'npm:@supabase/server@1.4.0');
  assert.match(config, /\[functions\.send-group-invitation\][\s\S]*?verify_jwt = true/);
  assert.match(index, /withSupabase\(\{ auth: "user"/);
  assert.match(index, /ctx\.supabase\.rpc\('loopedin_prepare_invitation_email'/);
  assert.match(index, /ctx\.supabaseAdmin\.rpc\('loopedin_finalize_invitation_email'/);
  assert.match(index, /ctx\.userClaims\?\.id/);
  assert.doesNotMatch(index, /ctx\.supabase\.rpc\('loopedin_finalize_invitation_email'/);
  assert.match(index, /readJsonBody\(req\)/);
  assert.doesNotMatch(index, /content-length|req\.json\(\)/i);
  assert.match(index, /req\.headers\.get\('origin'\) !== appOrigin/);
  assert.match(index, /Deno\.env\.get\('LOOPEDIN_APP_ORIGIN'\)/);
  assert.match(index, /Deno\.env\.get\('RESEND_INVITATION_API_KEY'\)/);
  assert.match(index, /Deno\.env\.get\('RESEND_INVITATION_FROM'\)/);
  assert.match(core, /https:\/\/api\.resend\.com\/emails/);
  assert.doesNotMatch(index, /console\./);
});
