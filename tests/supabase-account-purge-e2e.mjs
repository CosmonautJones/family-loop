import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { readPurgeJournal } from '../scripts/account-purge-journal.mjs';

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const journalPassphrase = process.env.LOOPEDIN_PURGE_JOURNAL_PASSPHRASE;
assert.ok(url && anonKey && serviceKey && journalPassphrase, 'local Supabase keys and journal passphrase are required');
assert.ok(['127.0.0.1', 'localhost', '::1'].includes(new URL(url).hostname), 'permanent purge E2E only runs against loopback Supabase');

const password = 'Local-only-purge-42!';
const bucket = 'loopedin-event-media';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl5kAAAAASUVORK5CYII=', 'base64');
const testCases = [
  ['PREPARED', ['leased', 'prepared']],
  ['OBJECTS_DELETED', ['leased', 'prepared', 'objects_deleted']],
  ['RELATIONAL_FINALIZED_BEFORE_CHECKPOINT', ['leased', 'prepared', 'objects_deleted']],
  ['AUTH_DELETED_BEFORE_CHECKPOINT', ['leased', 'prepared', 'objects_deleted', 'relational_finalized']],
  ['DB_COMPLETE_BEFORE_CHECKPOINT', ['leased', 'prepared', 'objects_deleted', 'relational_finalized', 'auth_deleted']],
];

async function request(path, { token = anonKey, headers = {}, ...options } = {}) {
  const response = await fetch(`${url}${path}`, { ...options, headers: { apikey: anonKey, Authorization: `Bearer ${token}`, ...headers } });
  const text = await response.text();
  let body = text;
  try { body = text ? JSON.parse(text) : null; } catch {}
  return { response, body };
}

async function ok(promise, label) {
  const result = await promise;
  assert.equal(result.response.ok, true, `${label} failed with status ${result.response.status}`);
  return result.body;
}

function rpc(name, token, body = {}) {
  return request(`/rest/v1/rpc/${name}`, { token, method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

function sql(statement) {
  const result = spawnSync('docker', ['exec', '-i', 'supabase_db_family-loop', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'], { input: statement, encoding: 'utf8' });
  assert.equal(result.status, 0, `local SQL fixture command failed: ${result.stderr.trim()}`);
  return result.stdout.trim();
}

async function signup(label, run) {
  const email = `${label.toLowerCase()}-${run}@loopedin.test`;
  const created = await ok(request('/auth/v1/signup', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, data: { display_name: label } }),
  }), `signup ${label}`);
  const login = await ok(request('/auth/v1/token?grant_type=password', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
  }), `login ${label}`);
  assert.equal(login.user.id, created.user.id);
  return { id: login.user.id, token: login.access_token, email };
}

async function upload(token, path) {
  return ok(request(`/storage/v1/object/${bucket}/${path}`, {
    token, method: 'POST', headers: { 'Content-Type': 'image/png', 'x-upsert': 'false' }, body: png,
  }), 'upload private fixture object');
}

function runOperator({ userId, operationId, journalPath, stopAfter }) {
  const environment = {
    ...process.env,
    LOOPEDIN_PURGE_CONFIRM: 'LOCAL_ONLY_ACCOUNT_PURGE',
    LOOPEDIN_PURGE_TEST_STOP_AFTER: stopAfter ?? '',
  };
  return spawnSync('pwsh', [
    '-NoProfile', '-File', 'scripts/invoke-account-purge.ps1',
    '-UserId', userId,
    '-OperationId', operationId,
    '-JournalPath', journalPath,
    '-LeaseOwner', 'LOCAL-E2E-OPERATOR',
  ], { cwd: process.cwd(), env: environment, encoding: 'utf8', timeout: 120_000 });
}

async function createFixture(index) {
  const run = `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`;
  const subject = await signup(`Subject${index}`, run);
  const owner = await signup(`Owner${index}`, run);
  const outsider = await signup(`Outsider${index}`, run);
  sql(`insert into loopedin_private.loopedin_group_creation_entitlements(user_id) values ('${subject.id}');`);
  const group = await ok(rpc('loopedin_create_group', subject.token, {
    target_name: `Purge fixture ${index}`,
    target_description: 'Disposable local purge fixture',
    target_kind: 'family',
    target_creation_key: crypto.randomUUID(),
  }), 'create purge fixture family');
  sql(`insert into public.loopedin_group_members(group_id,user_id,role) values ('${group.id}','${owner.id}','member');`);
  await ok(rpc('loopedin_transfer_group_ownership', subject.token, { target_group_id: group.id, target_user_id: owner.id }), 'transfer fixture ownership');

  const startsAt = new Date(Date.now() + 86400000).toISOString();
  const event = await ok(rpc('loopedin_create_event', subject.token, {
    target_group_id: group.id,
    target_title: 'Shared plan that must survive',
    target_starts_at: startsAt,
    target_ends_at: new Date(Date.now() + 90000000).toISOString(),
    target_location: 'Wisconsin',
    target_description: 'Disposable purge fixture',
    target_status_label: 'Open',
    target_visibility: 'group',
    target_timeline: [],
    target_cover_url: null,
    target_operation_key: crypto.randomUUID(),
  }), 'create shared fixture event');
  await ok(rpc('loopedin_send_event_message', subject.token, {
    target_event_id: event.id, target_body: 'Disposable contribution', target_operation_key: crypto.randomUUID(),
  }), 'create subject message');
  await ok(request('/rest/v1/loopedin_rsvps', {
    token: subject.token, method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_id: event.id, user_id: subject.id, person_name: `Subject${index}`, status: 'going' }),
  }), 'create subject RSVP');
  await ok(request('/rest/v1/loopedin_reminder_drafts', {
    token: subject.token, method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_id: event.id, user_id: subject.id, body: 'Morning of event', enabled: true }),
  }), 'create subject reminder');

  const mediaPath = `${event.id}/${subject.id}/${crypto.randomUUID()}.png`;
  const media = await ok(rpc('loopedin_begin_media_upload', subject.token, {
    target_event_id: event.id, target_storage_path: mediaPath, target_caption: 'Fixture', target_alt_text: 'Disposable fixture image',
  }), 'begin subject media');
  await upload(subject.token, mediaPath);
  await ok(rpc('loopedin_activate_media', subject.token, { target_media_id: media.id }), 'activate subject media');

  const orphanPath = `${event.id}/${subject.id}/${crypto.randomUUID()}.png`;
  const orphan = await ok(rpc('loopedin_begin_media_upload', subject.token, {
    target_event_id: event.id, target_storage_path: orphanPath, target_caption: 'Orphan fixture', target_alt_text: 'Disposable orphan fixture image',
  }), 'begin orphan media');
  await upload(subject.token, orphanPath);
  await ok(rpc('loopedin_activate_media', subject.token, { target_media_id: orphan.id }), 'activate orphan media');
  sql(`delete from public.loopedin_event_media where id='${orphan.id}';`);

  const invitedByEmailId = sql(`insert into public.loopedin_group_invitations(group_id,invited_by,invitee_email,token_hash,status,expires_at) values ('${group.id}','${owner.id}','${subject.email}',extensions.digest(gen_random_uuid()::text,'sha256'),'pending',now()+interval '7 days') returning id;`).split(/\r?\n/)[0];
  const respondedById = sql(`insert into public.loopedin_group_invitations(group_id,invited_by,invitee_email,token_hash,status,expires_at,responded_by,responded_at) values ('${group.id}','${owner.id}','other-${run}@loopedin.test',extensions.digest(gen_random_uuid()::text,'sha256'),'declined',now()+interval '7 days','${subject.id}',now()) returning id;`).split(/\r?\n/)[0];
  sql(`insert into loopedin_private.loopedin_invitation_email_deliveries(invitation_id,requested_by,operation_key) values ('${invitedByEmailId}','${owner.id}',gen_random_uuid()),('${respondedById}','${owner.id}',gen_random_uuid());`);

  const deletion = await ok(rpc('loopedin_request_account_deletion', subject.token), 'request fixture deletion');
  sql(`update loopedin_private.loopedin_account_deletion_requests set requested_at=now()-interval '31 days', purge_after=now()-interval '1 day', backup_expires_after=now()+interval '29 days' where user_id='${subject.id}' and status='pending';`);
  const backupExpiresAfter = new Date(Date.now() + 29 * 86400000);
  return { subject, owner, outsider, groupId: group.id, eventId: event.id, mediaPath, orphanPath, invitedByEmailId, respondedById, backupExpiresAfter, deletion };
}

async function cleanupFixture(fixture) {
  if (!fixture) return true;
  const paths = [fixture.mediaPath, fixture.orphanPath].filter(Boolean);
  if (paths.length > 0) {
    await request(`/storage/v1/object/${bucket}`, {
      token: serviceKey, method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: paths }),
    });
  }
  const result = spawnSync('docker', ['exec', '-i', 'supabase_db_family-loop', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'], { input: `
    delete from public.loopedin_event_media where event_id='${fixture.eventId}';
    delete from public.loopedin_groups where id='${fixture.groupId}';
    ${fixture.operationId ? `delete from loopedin_private.loopedin_account_purge_operations where id='${fixture.operationId}';` : ''}
    delete from loopedin_private.loopedin_account_lifecycle_records where user_id in ('${fixture.subject.id}','${fixture.owner.id}','${fixture.outsider.id}');
    delete from loopedin_private.loopedin_account_legal_holds where user_id in ('${fixture.subject.id}','${fixture.owner.id}','${fixture.outsider.id}');
    delete from loopedin_private.loopedin_account_deletion_requests where user_id in ('${fixture.subject.id}','${fixture.owner.id}','${fixture.outsider.id}');
    delete from auth.users where id in ('${fixture.subject.id}','${fixture.owner.id}','${fixture.outsider.id}');
  `, encoding: 'utf8' });
  return result.status === 0;
}

const directory = await mkdtemp(join(tmpdir(), 'loopedin-purge-e2e-'));
try {
  for (let index = 0; index < testCases.length; index += 1) {
    const [stopAfter, expectedStoppedPhases] = testCases[index];
    let fixture;
    let caseError;
    try {
      fixture = await createFixture(index);
      const operationId = crypto.randomUUID();
      fixture.operationId = operationId;
      const journalPath = join(directory, `${index}.lpjournal`);

      if (index === 0) {
        sql(`begin; set constraints all deferred; update public.loopedin_group_members set role=case when user_id='${fixture.subject.id}' then 'owner' else 'member' end where group_id='${fixture.groupId}' and user_id in ('${fixture.subject.id}','${fixture.owner.id}'); commit;`);
        const ownerLease = await rpc('loopedin_lease_account_purge', serviceKey, {
          target_operation_id: operationId, target_user_id: fixture.subject.id, target_lease_owner: 'LOCAL-E2E-OPERATOR',
        });
        assert.equal(ownerLease.response.ok, false, 'owner unexpectedly leased for purge');
        sql(`begin; set constraints all deferred; update public.loopedin_group_members set role=case when user_id='${fixture.owner.id}' then 'owner' else 'member' end where group_id='${fixture.groupId}' and user_id in ('${fixture.subject.id}','${fixture.owner.id}'); commit;`);

        await ok(rpc('loopedin_place_account_legal_hold', serviceKey, {
          target_user_id: fixture.subject.id, target_reason_code: 'LOCAL_TEST', target_operator_reference: 'PURGE-E2E-001',
        }), 'place purge fixture hold');
        const heldLease = await rpc('loopedin_lease_account_purge', serviceKey, {
          target_operation_id: operationId, target_user_id: fixture.subject.id, target_lease_owner: 'LOCAL-E2E-OPERATOR',
        });
        assert.equal(heldLease.response.ok, false, 'held account unexpectedly leased for purge');
        await ok(rpc('loopedin_release_account_legal_hold', serviceKey, {
          target_user_id: fixture.subject.id, target_operator_reference: 'PURGE-E2E-002',
        }), 'release purge fixture hold');

        const unprivilegedLease = await rpc('loopedin_lease_account_purge', fixture.subject.token, {
          target_operation_id: operationId, target_user_id: fixture.subject.id, target_lease_owner: 'LOCAL-E2E-OPERATOR',
        });
        assert.equal(unprivilegedLease.response.ok, false, 'authenticated user executed service-only purge lease');
        await ok(rpc('loopedin_lease_account_purge', serviceKey, {
          target_operation_id: operationId, target_user_id: fixture.subject.id, target_lease_owner: 'LOCAL-E2E-OPERATOR',
        }), 'lease purge fixture');
        const firstPlan = await ok(rpc('loopedin_prepare_account_purge', serviceKey, {
          target_operation_id: operationId, target_lease_owner: 'LOCAL-E2E-OPERATOR',
        }), 'prepare purge fixture');
        const secondPlan = await ok(rpc('loopedin_prepare_account_purge', serviceKey, {
          target_operation_id: operationId, target_lease_owner: 'LOCAL-E2E-OPERATOR',
        }), 'replay purge preparation');
        assert.equal(firstPlan.planDigest, secondPlan.planDigest);
        assert.deepEqual(firstPlan.objectPaths, [fixture.mediaPath, fixture.orphanPath].sort());
        const prematureFinalize = await rpc('loopedin_finalize_account_purge_relational', serviceKey, {
          target_operation_id: operationId, target_lease_owner: 'LOCAL-E2E-OPERATOR', target_plan_digest: firstPlan.planDigest,
        });
        assert.equal(prematureFinalize.response.ok, false, 'relational cleanup ran before object absence');
        assert.equal(sql(`select count(*) from public.loopedin_profiles where id='${fixture.subject.id}';`), '1');
        assert.equal((await request(`/auth/v1/admin/users/${fixture.subject.id}`, { token: serviceKey })).response.ok, true, 'Auth was deleted before object cleanup');
      }

      const stopped = runOperator({ userId: fixture.subject.id, operationId, journalPath, stopAfter });
      assert.equal(stopped.status, 86, `failure injection ${stopAfter} did not stop at the intended boundary`);
      const stoppedRecords = await readPurgeJournal(journalPath, journalPassphrase);
      assert.deepEqual(stoppedRecords.map((record) => record.phase), expectedStoppedPhases);

      const resumed = runOperator({ userId: fixture.subject.id, operationId, journalPath });
      assert.equal(resumed.status, 0, `operator retry after ${stopAfter} did not converge: ${resumed.stderr.trim()} ${resumed.stdout.trim()}`);
      const records = await readPurgeJournal(journalPath, journalPassphrase);
      assert.deepEqual(records.filter((record) => record.phase !== 'failed').map((record) => record.phase), [
        'leased', 'prepared', 'objects_deleted', 'relational_finalized', 'auth_deleted', 'completed',
      ]);
      assert.ok(records.every((record) => Date.parse(record.retainUntil) >= fixture.backupExpiresAfter.getTime() + 86400000 - 5000));
      const rawJournal = await readFile(journalPath, 'utf8');
      assert.equal(rawJournal.includes(fixture.mediaPath), false);
      assert.equal(rawJournal.includes(fixture.subject.id), false);
      assert.equal(rawJournal.includes(fixture.subject.email), false);

      assert.equal((await request(`/auth/v1/admin/users/${fixture.subject.id}`, { token: serviceKey })).response.status, 404);
      assert.equal(sql(`select count(*) from public.loopedin_groups where id='${fixture.groupId}' and created_by is null;`), '1');
      assert.equal(sql(`select count(*) from public.loopedin_events where id='${fixture.eventId}' and created_by is null;`), '1');
      assert.equal(sql(`select count(*) from public.loopedin_group_members where user_id='${fixture.subject.id}';`), '0');
      assert.equal(sql(`select count(*) from public.loopedin_event_messages where author_id='${fixture.subject.id}';`), '0');
      assert.equal(sql(`select count(*) from public.loopedin_event_media where uploaded_by='${fixture.subject.id}';`), '0');
      assert.equal(sql(`select count(*) from storage.objects where bucket_id='${bucket}' and owner_id='${fixture.subject.id}';`), '0');
      assert.equal(sql(`select count(*) from public.loopedin_group_invitations where id in ('${fixture.invitedByEmailId}','${fixture.respondedById}');`), '0');
      assert.equal(sql(`select count(*) from loopedin_private.loopedin_invitation_email_deliveries where invitation_id in ('${fixture.invitedByEmailId}','${fixture.respondedById}');`), '0');
      assert.equal(sql(`select status || ':' || (user_id is null)::text || ':' || (request_id is null)::text || ':' || (frozen_plan ? 'objectPaths')::text from loopedin_private.loopedin_account_purge_operations where id='${operationId}';`), 'completed:true:true:false');
      const ownerEvents = await ok(request(`/rest/v1/loopedin_events?id=eq.${fixture.eventId}&select=id`, { token: fixture.owner.token }), 'owner reads preserved shared event');
      assert.equal(ownerEvents.length, 1);
      const outsiderEvents = await ok(request(`/rest/v1/loopedin_events?id=eq.${fixture.eventId}&select=id`, { token: fixture.outsider.token }), 'outsider reads preserved event');
      assert.equal(outsiderEvents.length, 0);

      const repeated = runOperator({ userId: fixture.subject.id, operationId, journalPath });
      assert.equal(repeated.status, 0, 'completed purge replay was not idempotent');
      assert.equal((await readPurgeJournal(journalPath, journalPassphrase)).length, records.length, 'completed replay appended duplicate evidence');
    } catch (error) {
      caseError = error;
      throw error;
    } finally {
      if (fixture) {
        const cleaned = await cleanupFixture(fixture);
        if (!caseError) assert.equal(cleaned, true, 'local purge fixture cleanup failed');
      }
    }
  }
  console.log('Local permanent account purge E2E passed: hold/owner/service gates, frozen union, invitation identity cleanup, object-first failure, five crash resumes, Auth-last completion, neutral shared creators, journal retention, outsider denial, and idempotent replay.');
} finally {
  await rm(directory, { recursive: true, force: true });
}
