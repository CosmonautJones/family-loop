import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrationName = '20260716043940_account_deletion_grace_state.sql';

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

test('account deletion migration enforces the approved recoverable grace state', () => {
  const migration = read(`supabase/migrations/${migrationName}`);

  assert.match(migration, /loopedin_account_deletion_requests/);
  assert.match(migration, /loopedin_account_lifecycle_records/);
  assert.match(migration, /loopedin_account_legal_holds/);
  assert.match(migration, /requested_at \+ interval '30 days'/);
  assert.match(migration, /backup_expires_after/);
  assert.match(migration, /loopedin_request_account_deletion/);
  assert.match(migration, /Transfer ownership before deleting your account\./);
  assert.match(migration, /loopedin_cancel_account_deletion/);
  assert.match(migration, /purge_after > now\(\)/);
  assert.match(migration, /loopedin_get_account_deletion_status/);
  assert.match(migration, /loopedin_private\.account_access_active/);
  assert.match(migration, /loopedin_create_group[\s\S]+pg_advisory_xact_lock[\s\S]+require_active_account/);
  assert.match(migration, /The new owner cannot have a pending account deletion\./);
  assert.match(migration, /grant execute on function public\.loopedin_get_account_deletion_status\(\) to authenticated/);
  assert.match(migration, /grant execute on function public\.loopedin_request_account_deletion\(\) to authenticated/);
  assert.match(migration, /grant execute on function public\.loopedin_cancel_account_deletion\(\) to authenticated/);
  assert.match(migration, /grant execute on function public\.loopedin_place_account_legal_hold\(uuid, text, text\) to service_role/);
  assert.match(migration, /grant execute on function public\.loopedin_release_account_legal_hold\(uuid, text\) to service_role/);
  assert.doesNotMatch(migration, /grant execute on function public\.loopedin_(?:place|release)_account_legal_hold[^;]+to authenticated/);
});

test('configured app gates family queries on deletion status and exposes recovery-only UI', () => {
  const api = read('app/src/services/api.ts');
  const queries = read('app/src/app/queries.ts');
  const protectedQueries = read('app/src/app/protectedQueries.ts');
  const provider = read('app/src/features/auth/AuthSessionProvider.tsx');
  const shell = read('app/src/navigation/AppShell.tsx');
  const card = read('app/src/features/account/AccountDeletionCard.tsx');
  const recovery = read('app/src/screens/AccountDeletionRecoveryScreen.tsx');

  assert.match(api, /AccountDeletionStatus/);
  assert.match(api, /accounts: AccountsApi/);
  assert.match(queries, /accountDeletionStatus/);
  assert.match(queries, /evictProtectedQueries/);
  assert.match(protectedQueries, /protectedQueryRoots/);
  assert.match(provider, /deletionStatusQuery/);
  assert.match(provider, /!deletionStatusQuery\.data && !deletionStatusQuery\.isError/);
  assert.match(provider, /status === 'authenticated' && deletionStatusResolved && !deletionStatusQuery\.data/);
  assert.match(shell, /AccountDeletionRecoveryScreen/);
  assert.match(shell, /auth\.deletionStatus/);
  assert.match(card, /DELETE/);
  assert.match(card, /30-day recoverable grace period/);
  assert.match(recovery, /Cancel account deletion/);
  assert.match(recovery, /Sign out/);
});

test('private media retains the established TTL until expiry-aware renewal exists', () => {
  const adapter = read('app/src/services/supabaseAdapter.ts');
  assert.match(adapter, /createSignedUrl\([^,]+,\s*3600\)/);
});
