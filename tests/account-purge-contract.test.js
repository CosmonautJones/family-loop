import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

const root = process.cwd();
const migrationPath = path.join(root, 'supabase', 'migrations', '20260716213000_permanent_account_purge_boundary.sql');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function migration() {
  assert.equal(fs.existsSync(migrationPath), true, 'the permanent account-purge boundary must be one forward migration');
  return fs.readFileSync(migrationPath, 'utf8').toLowerCase();
}

function functionBody(sql, name) {
  const start = sql.indexOf(`create or replace function public.${name}`);
  assert.notEqual(start, -1, `missing public.${name}`);
  const bodyStart = sql.indexOf('as $$', start);
  assert.notEqual(bodyStart, -1, `public.${name} must have an inspectable SQL body`);
  const end = sql.indexOf('$$;', bodyStart);
  assert.notEqual(end, -1, `public.${name} body is incomplete`);
  return sql.slice(start, end + 3);
}

const purgeFunctions = [
  'loopedin_lease_account_purge',
  'loopedin_prepare_account_purge',
  'loopedin_finalize_account_purge_relational',
  'loopedin_complete_account_purge',
];

test('permanent purge detaches shared creator references without cascading or reassignment', () => {
  const sql = migration();

  for (const [table, constraint] of [
    ['loopedin_groups', 'loopedin_groups_created_by_fkey'],
    ['loopedin_events', 'loopedin_events_created_by_fkey'],
  ]) {
    assert.match(sql, new RegExp(`alter table\\s+public\\.${table}[^;]*alter column\\s+created_by\\s+drop not null`, 's'));
    const replacement = sql.match(new RegExp(`alter table\\s+public\\.${table}[^;]*add constraint\\s+${constraint}[^;]*;`, 's'))?.[0] ?? '';
    assert.match(replacement, /foreign key\s*\(\s*created_by\s*\)\s*references\s+auth\.users\s*\(\s*id\s*\)\s*on delete set null/);
    assert.doesNotMatch(replacement, /on delete cascade/);
  }

  assert.doesNotMatch(sql, /update\s+public\.loopedin_(?:groups|events)\s+set\s+created_by/);
});

test('purge state is leased, frozen, bounded, and service-role only', () => {
  const sql = migration();
  const state = sql.match(/create table\s+loopedin_private\.[a-z0-9_]*purge[a-z0-9_]*\s*\([^;]+;/s)?.[0] ?? '';

  assert.ok(state, 'missing private purge state');
  assert.match(state, /status\s+text/);
  assert.match(state, /check\s*\(\s*status\s+in\s*\([^)]+\)\s*\)/s);
  assert.match(state, /lease_owner/);
  assert.match(state, /lease_expires_at/);
  assert.match(state, /plan_digest/);
  assert.match(state, /(?:frozen_)?plan\s+jsonb/);
  assert.match(state, /(?:plan|object)[a-z0-9_]*count/);

  for (const name of purgeFunctions) {
    const body = functionBody(sql, name);
    assert.match(body, /auth\.role\(\)\s*(?:=|<>|!=|is\s+distinct\s+from)\s*'service_role'/);
    assert.match(sql, new RegExp(`revoke\\s+all\\s+on\\s+function\\s+public\\.${name}\\([^;]*\\)\\s+from\\s+public\\s*,\\s*anon\\s*,\\s*authenticated\\s*;`, 's'));
    assert.match(sql, new RegExp(`grant\\s+execute\\s+on\\s+function\\s+public\\.${name}\\([^;]*\\)\\s+to\\s+service_role\\s*;`, 's'));
    assert.doesNotMatch(sql, new RegExp(`grant\\s+execute\\s+on\\s+function\\s+public\\.${name}\\([^;]*\\)\\s+to\\s+(?:anon|authenticated)\\b`, 's'));
  }
});

test('prepare freezes a deterministic complete private-object plan and every destructive stage rechecks eligibility', () => {
  const sql = migration();
  const prepare = functionBody(sql, 'loopedin_prepare_account_purge');

  assert.match(prepare, /public\.loopedin_event_media/);
  assert.match(prepare, /storage_path/);
  assert.match(prepare, /uploaded_by\s*=\s*[a-z0-9_.]*subject/);
  assert.match(prepare, /storage\.objects/);
  assert.match(prepare, /bucket_id\s*=\s*'loopedin-event-media'/);
  assert.match(prepare, /owner_id\s*=\s*[a-z0-9_.():]*subject/);
  assert.match(prepare, /\bunion\b/);
  assert.match(prepare, /\bdistinct\b/);
  assert.match(prepare, /order by/);
  assert.match(prepare, /digest\s*\(/);
  assert.match(prepare, /plan_digest/);

  for (const name of [
    'loopedin_lease_account_purge',
    'loopedin_prepare_account_purge',
    'loopedin_finalize_account_purge_relational',
  ]) {
    const body = functionBody(sql, name);
    assert.match(body, /pg_advisory_xact_lock/);
    assert.match(body, /status\s*=\s*'pending'/);
    assert.match(body, /purge_after\s*<=\s*(?:now\(\)|current_timestamp|statement_timestamp\(\))/);
    assert.match(body, /loopedin_group_members/);
    assert.match(body, /role\s*=\s*'owner'/);
    assert.match(body, /legal_hold/);
    assert.match(body, /released_at\s+is\s+null/);
  }
});

test('relational finalization is lease-bound, digest-bound, and object-absence gated', () => {
  const sql = migration();
  const finalize = functionBody(sql, 'loopedin_finalize_account_purge_relational');

  assert.match(finalize, /lease_owner/);
  assert.match(finalize, /lease_expires_at/);
  assert.match(finalize, /plan_digest/);
  assert.match(finalize, /storage\.objects/);
  assert.match(finalize, /(?:if\s+exists|not\s+exists)\s*\([^)]*storage\.objects/s);

  const objectCheck = finalize.indexOf('storage.objects');
  const relationalDelete = finalize.search(/delete\s+from\s+(?:public|loopedin_private)\./);
  assert.ok(objectCheck >= 0 && relationalDelete > objectCheck, 'planned Storage-object absence must be checked before relational deletion');

  const complete = functionBody(sql, 'loopedin_complete_account_purge');
  assert.match(complete, /auth\.users/);
  assert.match(complete, /if\s+exists\s*\([^)]*auth\.users/s);
  assert.match(complete, /(?:already_completed|not_found|delete\s+from\s+loopedin_private\.)/s);
});

test('completed replay is discoverable and inbound invitation identity is erased', () => {
  const sql = migration();
  const lease = functionBody(sql, 'loopedin_lease_account_purge');
  const completedLookup = lease.indexOf("status = 'completed'");
  const eligibilityLookup = lease.indexOf('from loopedin_private.loopedin_account_deletion_requests');
  assert.ok(completedLookup >= 0 && completedLookup < eligibilityLookup, 'completed operations must be discoverable before deleted-request eligibility');

  const finalize = functionBody(sql, 'loopedin_finalize_account_purge_relational');
  assert.match(finalize, /auth\.users/);
  assert.match(finalize, /lower\([^)]*email/);
  assert.match(finalize, /loopedin_invitation_email_deliveries/);
  assert.match(finalize, /invitation_id/);
  assert.match(finalize, /responded_by\s*=\s*subject_id/);
  assert.match(finalize, /invitee_email\s*=\s*subject_email/);
});

test('nullable event creators remain neutral in the application model', () => {
  const domain = read('app/src/types/domain.ts');
  const adapter = read('app/src/services/supabaseAdapter.ts');

  assert.match(domain, /creatorId:\s*(?:PersonId|string)\s*\|\s*null/);
  assert.match(adapter, /created_by:\s*string\s*\|\s*null/);
  assert.match(adapter, /creatorId:\s*row\.created_by\b/);
  assert.doesNotMatch(adapter, /creatorId:\s*row\.created_by\s*(?:\?\?|\|\|)/);
});
