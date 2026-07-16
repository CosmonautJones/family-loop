import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';

const EXPECTED_PROJECT_REF = 'vkogznsfthirhxkqysza';
const QUARANTINED_PROJECT_REF = 'lzscofbvecgpchokxhyb';
const QA_MARKER = 'loopedin_hosted_account_lifecycle_qa';
const BUCKET = 'loopedin-event-media';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl5kAAAAASUVORK5CYII=', 'base64');
const ROLES = ['subject', 'successor', 'outsider'];
const sensitiveValues = new Set();

const projectRef = process.env.LOOPEDIN_HOSTED_PROJECT_REF;
const url = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const linkedProjectRef = readFileSync(new URL('../supabase/.temp/project-ref', import.meta.url), 'utf8').trim();

assert.equal(process.env.LOOPEDIN_HOSTED_STAGING_ACK, 'I_ACKNOWLEDGE_LOOPEDIN_STAGING_ONLY');
assert.equal(projectRef, EXPECTED_PROJECT_REF, 'unexpected hosted project');
assert.equal(linkedProjectRef, EXPECTED_PROJECT_REF, 'Supabase CLI is not linked to the dedicated staging project');
assert.notEqual(projectRef, QUARANTINED_PROJECT_REF, 'quarantined project refused');
assert.equal(url, `https://${EXPECTED_PROJECT_REF}.supabase.co`, 'unexpected hosted URL');
assert.ok(publishableKey?.startsWith('sb_publishable_'), 'publishable key required');
assert.ok(secretKey?.startsWith('sb_secret_'), 'secret key required');

function randomPassword() {
  const value = `${crypto.randomBytes(36).toString('base64url')}Aa1!`;
  sensitiveValues.add(value);
  return value;
}

function redact(value) {
  let text = value instanceof Error ? value.message : String(value);
  for (const secret of [publishableKey, secretKey, ...sensitiveValues]) if (secret) text = text.replaceAll(secret, '[REDACTED]');
  return text
    .replace(/https?:\/\/[^\s]+/gi, '[REDACTED_URL]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED_TOKEN]')
    .replace(/sb_(?:publishable|secret)_[A-Za-z0-9_-]+/g, '[REDACTED_KEY]');
}

function safeUuid(value) {
  assert.match(value ?? '', /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, 'invalid synthetic UUID');
  return value;
}

function dbQuery(statement, label) {
  const cliScript = join(dirname(process.execPath), 'node_modules', 'supabase', 'dist', 'supabase.js');
  const command = process.platform === 'win32' ? process.execPath : 'supabase';
  const prefix = process.platform === 'win32' ? [cliScript] : [];
  const result = spawnSync(command, [...prefix, 'db', 'query', '--linked', '--output', 'json', statement], {
    cwd: new URL('..', import.meta.url), encoding: 'utf8', windowsHide: true,
  });
  if (result.status !== 0) throw new Error(`${label} failed through the dedicated staging SQL seam`);
  try {
    return JSON.parse(result.stdout).rows ?? [];
  } catch {
    throw new Error(`${label} returned an invalid staging SQL response`);
  }
}

async function request(path, { token = publishableKey, headers = {}, ...options } = {}) {
  const apiKey = token === secretKey ? secretKey : publishableKey;
  const response = await fetch(`${url}${path}`, {
    ...options,
    headers: { apikey: apiKey, Authorization: `Bearer ${token}`, ...headers },
  });
  const text = await response.text();
  let body = text;
  try { body = text ? JSON.parse(text) : null; } catch {}
  return { response, body };
}

async function required(resultPromise, label) {
  const result = await resultPromise;
  if (!result.response.ok) throw new Error(`${label} failed (HTTP ${result.response.status})`);
  return result.body;
}

function rpc(name, token, body = {}) {
  return request(`/rest/v1/rpc/${name}`, {
    token, method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
}

function table(name, token, suffix = '', options = {}) {
  return request(`/rest/v1/${name}${suffix}`, { token, ...options });
}

function markerFor(runId, role) {
  return { [QA_MARKER]: true, loopedin_qa_run_id: runId, loopedin_qa_role: role };
}

function emailFor(runId, role) {
  const slug = runId.replaceAll('-', '').slice(-20);
  return `loopedin-lifecycle-${role}-${slug}@loopedin.invalid`;
}

function isMarked(user, runId, role) {
  const metadata = user?.app_metadata ?? {};
  return metadata[QA_MARKER] === true
    && metadata.loopedin_qa_run_id === runId
    && metadata.loopedin_qa_role === role;
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical).sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  return value;
}

async function protectedFingerprint(qaUserIds) {
  const tables = [
    'loopedin_profiles', 'loopedin_groups', 'loopedin_group_members', 'loopedin_events',
    'loopedin_rsvps', 'loopedin_event_messages', 'loopedin_event_media', 'loopedin_notifications',
    'loopedin_reminder_drafts', 'loopedin_group_invitations',
  ];
  const state = {};
  for (const name of tables) {
    const rows = await required(table(name, secretKey, '?select=*'), `snapshot protected ${name}`);
    state[name] = name === 'loopedin_profiles' ? rows.filter((row) => !qaUserIds.has(row.id)) : rows;
  }
  state.storage = await required(request(`/storage/v1/object/list/${BUCKET}`, {
    token: secretKey,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix: '', limit: 1000, offset: 0, sortBy: { column: 'name', order: 'asc' } }),
  }), 'snapshot protected storage');
  return crypto.createHash('sha256').update(JSON.stringify(canonical(state))).digest('hex');
}

async function createUser(runId, role) {
  const email = emailFor(runId, role);
  const password = randomPassword();
  sensitiveValues.add(email);
  const user = await required(request('/auth/v1/admin/users', {
    token: secretKey,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email, password, email_confirm: true,
      user_metadata: { display_name: `LoopedIn lifecycle QA ${role}` },
      app_metadata: markerFor(runId, role),
    }),
  }), `create ${role} QA user`);
  assert.ok(isMarked(user, runId, role), 'synthetic Auth marker mismatch');
  const session = await required(request('/auth/v1/token?grant_type=password', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
  }), `sign in ${role} QA user`);
  assert.equal(session.user.id, user.id, 'synthetic session identity mismatch');
  sensitiveValues.add(session.access_token);
  sensitiveValues.add(session.refresh_token);
  return { id: safeUuid(user.id), role, token: session.access_token };
}

async function adminUsers() {
  const body = await required(request('/auth/v1/admin/users?page=1&per_page=1000', { token: secretKey }), 'list synthetic Auth users');
  return Array.isArray(body) ? body : body.users ?? [];
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function adminUsersWithRetry(label, attempts = 3) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await adminUsers();
    } catch {
      if (attempt === attempts) throw new Error(`${label} failed after ${attempts} attempts`);
      await delay(attempt * 250);
    }
  }
  throw new Error(`${label} failed`);
}

async function upload(token, path) {
  return request(`/storage/v1/object/${BUCKET}/${path}`, {
    token, method: 'POST', headers: { 'Content-Type': 'image/png', 'x-upsert': 'false' }, body: PNG,
  });
}

async function signObject(token, path) {
  return request(`/storage/v1/object/sign/${BUCKET}/${path}`, {
    token, method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn: 60 }),
  });
}

async function downloadObject(token, path) {
  const response = await fetch(`${url}/storage/v1/object/authenticated/${BUCKET}/${path}`, {
    headers: { apikey: publishableKey, Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`download restored private media failed (HTTP ${response.status})`);
  return Buffer.from(await response.arrayBuffer());
}

async function deleteObjectAndConfirmAbsent(path, attempts = 3) {
  const segments = path.split('/');
  const objectName = segments.pop();
  const prefix = segments.join('/');
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const removed = await request(`/storage/v1/object/${BUCKET}`, {
      token: secretKey,
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefixes: [path] }),
    }).catch(() => null);
    const listed = await request(`/storage/v1/object/list/${BUCKET}`, {
      token: secretKey,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix, limit: 1000, offset: 0 }),
    }).catch(() => null);
    const absent = listed?.response.ok
      && Array.isArray(listed.body)
      && !listed.body.some((item) => item.name === objectName || item.name === path);
    if ((removed?.response.ok || removed?.response.status === 404) && absent) return;
    if (attempt < attempts) await delay(attempt * 250);
  }
  throw new Error('synthetic private object deletion could not be confirmed');
}

async function cleanup(runId, users, storagePath) {
  const cleanupUsers = new Map(Object.values(users).filter((user) => user.id).map((user) => [user.id, user]));
  const listed = await adminUsersWithRetry('discover marked synthetic Auth users');
  for (const candidate of listed) {
    const role = candidate.app_metadata?.loopedin_qa_role;
    if (ROLES.includes(role) && isMarked(candidate, runId, role) && candidate.email?.toLowerCase() === emailFor(runId, role)) {
      sensitiveValues.add(candidate.email);
      cleanupUsers.set(candidate.id, { id: safeUuid(candidate.id), role });
    }
  }
  const ids = [...cleanupUsers.values()].map((user) => safeUuid(user.id));
  if (storagePath) await deleteObjectAndConfirmAbsent(storagePath);
  if (ids.length) {
    const idList = ids.map((id) => `'${id}'::uuid`).join(',');
    dbQuery(`
      do $$
      begin
        if (select count(*) from auth.users
            where id in (${idList})
              and raw_app_meta_data->>'${QA_MARKER}' = 'true'
              and raw_app_meta_data->>'loopedin_qa_run_id' = '${runId}') <> ${ids.length} then
          raise exception 'synthetic marker mismatch';
        end if;
        delete from loopedin_private.loopedin_account_lifecycle_records where user_id in (${idList});
        delete from loopedin_private.loopedin_account_legal_holds where user_id in (${idList});
        delete from loopedin_private.loopedin_account_deletion_requests where user_id in (${idList});
        delete from loopedin_private.loopedin_group_creation_entitlements where user_id in (${idList});
        delete from public.loopedin_event_media media
        using public.loopedin_events event, public.loopedin_groups family
        where media.event_id = event.id
          and event.group_id = family.id
          and family.created_by in (${idList})
          and family.description = 'loopedin-hosted-lifecycle-qa:${runId}';
        delete from public.loopedin_groups
        where created_by in (${idList}) and description = 'loopedin-hosted-lifecycle-qa:${runId}';
      end $$;
    `, 'clean synthetic database state');
  }
  for (const user of cleanupUsers.values()) {
    const current = await request(`/auth/v1/admin/users/${user.id}`, { token: secretKey }).catch(() => null);
    if (!current?.response.ok) continue;
    if (!isMarked(current.body, runId, user.role) || current.body.email?.toLowerCase() !== emailFor(runId, user.role)) {
      throw new Error('refusing to delete an unmarked Auth user');
    }
    await required(request(`/auth/v1/admin/users/${user.id}`, { token: secretKey, method: 'DELETE' }), 'delete marked QA user');
  }
  let markedAuthResidue = [];
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    markedAuthResidue = (await adminUsersWithRetry('verify marked synthetic Auth residue'))
      .filter((user) => user.app_metadata?.[QA_MARKER] === true && user.app_metadata?.loopedin_qa_run_id === runId);
    if (markedAuthResidue.length === 0) break;
    if (attempt < 4) await delay(attempt * 250);
  }
  assert.equal(markedAuthResidue.length, 0, 'marked synthetic Auth residue remains');
  if (!ids.length) return;
  const idList = ids.map((id) => `'${id}'::uuid`).join(',');
  const [residue] = dbQuery(`
    select
      (select count(*) from auth.users where id in (${idList}))::int as users,
      (select count(*) from public.loopedin_profiles where id in (${idList}))::int as profiles,
      (select count(*) from public.loopedin_group_members where user_id in (${idList}))::int as memberships,
      (select count(*) from public.loopedin_groups where created_by in (${idList}))::int as groups,
      (select count(*) from loopedin_private.loopedin_group_creation_entitlements where user_id in (${idList}))::int as entitlements,
      (select count(*) from loopedin_private.loopedin_account_deletion_requests where user_id in (${idList}))::int as requests,
      (select count(*) from loopedin_private.loopedin_account_legal_holds where user_id in (${idList}))::int as holds,
      (select count(*) from loopedin_private.loopedin_account_lifecycle_records where user_id in (${idList}))::int as records,
      (select count(*) from storage.objects where bucket_id = '${BUCKET}' and owner_id::text in (${ids.map((id) => `'${id}'`).join(',')}))::int as objects;
  `, 'verify synthetic residue');
  assert.ok(residue && Object.values(residue).every((count) => count === 0), 'synthetic lifecycle residue remains');
}

async function run() {
  const runId = `lqa-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
  assert.match(runId, /^[a-z0-9-]{12,47}$/);
  const users = {};
  const qaUserIds = new Set();
  let protectedBefore;
  let groupId;
  let eventId;
  let mediaId;
  let storagePath;
  let summary;
  let primaryError;
  try {
    for (const role of ROLES) {
      users[role] = await createUser(runId, role);
      qaUserIds.add(users[role].id);
    }
    protectedBefore = await protectedFingerprint(qaUserIds);
    const { subject, successor, outsider } = users;
    dbQuery(`
      insert into loopedin_private.loopedin_group_creation_entitlements(user_id)
      select '${subject.id}'::uuid
      where exists (
        select 1 from auth.users where id = '${subject.id}'::uuid
          and raw_app_meta_data->>'${QA_MARKER}' = 'true'
          and raw_app_meta_data->>'loopedin_qa_run_id' = '${runId}'
      ) on conflict (user_id) do nothing;
    `, 'entitle synthetic owner');
    const group = await required(rpc('loopedin_create_group', subject.token, {
      target_name: `LoopedIn lifecycle QA ${runId}`,
      target_description: `loopedin-hosted-lifecycle-qa:${runId}`,
      target_kind: 'family', target_creation_key: crypto.randomUUID(),
    }), 'create synthetic family');
    groupId = safeUuid(group.id);
    dbQuery(`
      insert into public.loopedin_group_members(group_id, user_id, role)
      select '${groupId}'::uuid, '${successor.id}'::uuid, 'member'
      where exists (
        select 1 from auth.users where id = '${successor.id}'::uuid
          and raw_app_meta_data->>'${QA_MARKER}' = 'true'
          and raw_app_meta_data->>'loopedin_qa_run_id' = '${runId}'
      );
    `, 'add synthetic successor');

    const ownerRequest = await rpc('loopedin_request_account_deletion', subject.token);
    assert.equal(ownerRequest.response.ok, false, 'family owner requested deletion before transfer');
    assert.match(String(ownerRequest.body?.message), /Transfer ownership/);
    await required(rpc('loopedin_transfer_group_ownership', subject.token, {
      target_group_id: groupId, target_user_id: successor.id,
    }), 'transfer synthetic ownership');
    const rolesBefore = await required(table('loopedin_group_members', subject.token, `?group_id=eq.${groupId}&select=user_id,role&order=user_id.asc`), 'read roles before deletion');
    assert.equal(rolesBefore.find((row) => row.user_id === subject.id)?.role, 'member');
    assert.equal(rolesBefore.find((row) => row.user_id === successor.id)?.role, 'owner');

    const startsAt = new Date(Date.now() + 86400000);
    const event = await required(rpc('loopedin_create_event', subject.token, {
      target_group_id: groupId, target_title: 'Hosted lifecycle QA trip',
      target_starts_at: startsAt.toISOString(), target_ends_at: new Date(startsAt.getTime() + 7200000).toISOString(),
      target_location: 'Synthetic staging location', target_description: 'Hosted account lifecycle proof',
      target_status_label: 'Open', target_visibility: 'group', target_timeline: [], target_cover_url: null,
      target_operation_key: crypto.randomUUID(),
    }), 'create synthetic event');
    eventId = safeUuid(event.id);
    storagePath = `${eventId}/${subject.id}/${crypto.randomUUID()}.png`;
    const media = await required(rpc('loopedin_begin_media_upload', subject.token, {
      target_event_id: eventId, target_storage_path: storagePath,
      target_caption: 'Lifecycle QA photo', target_alt_text: 'One pixel synthetic private image',
    }), 'begin synthetic media upload');
    mediaId = safeUuid(media.id);
    await required(upload(subject.token, storagePath), 'upload synthetic private media');
    await required(rpc('loopedin_activate_media', subject.token, { target_media_id: mediaId }), 'activate synthetic private media');
    await required(signObject(subject.token, storagePath), 'sign media before deletion request');
    assert.equal((await required(table('loopedin_groups', outsider.token, `?id=eq.${groupId}&select=id`), 'verify outsider precondition')).length, 0);
    assert.equal((await required(table('loopedin_profiles', outsider.token, `?id=eq.${outsider.id}&select=id`), 'verify outsider account precondition')).length, 1);

    const deletion = await required(rpc('loopedin_request_account_deletion', subject.token), 'request synthetic account deletion');
    assert.equal(deletion.status, 'pending');
    assert.equal(new Date(deletion.purgeAfter).getTime() - new Date(deletion.requestedAt).getTime(), 30 * 86400000);
    assert.equal(new Date(deletion.backupExpiresAfter).getTime() - new Date(deletion.purgeAfter).getTime(), 30 * 86400000);
    assert.deepEqual(await required(rpc('loopedin_get_account_deletion_status', subject.token), 'read pending lifecycle status'), deletion);
    assert.deepEqual(await required(table('loopedin_groups', subject.token, `?id=eq.${groupId}&select=id`), 'pending database read'), []);
    assert.deepEqual(await required(table('loopedin_event_media', subject.token, `?id=eq.${mediaId}&select=id`), 'pending media metadata read'), []);
    assert.equal((await rpc('loopedin_create_event', subject.token, {
      target_group_id: groupId, target_title: 'Denied pending event', target_starts_at: startsAt.toISOString(),
      target_ends_at: new Date(startsAt.getTime() + 7200000).toISOString(), target_location: '', target_description: '',
      target_status_label: 'Open', target_visibility: 'group', target_timeline: [], target_cover_url: null,
      target_operation_key: crypto.randomUUID(),
    })).response.ok, false, 'pending account used a protected RPC');
    assert.equal((await signObject(subject.token, storagePath)).response.ok, false, 'pending account received a new signed URL');
    assert.equal((await request(`/storage/v1/object/authenticated/${BUCKET}/${storagePath}`, { token: subject.token })).response.ok, false, 'pending account downloaded private media');
    assert.equal((await rpc('loopedin_transfer_group_ownership', successor.token, {
      target_group_id: groupId, target_user_id: subject.id,
    })).response.ok, false, 'pending account received ownership');

    assert.equal((await rpc('loopedin_place_account_legal_hold', subject.token, {
      target_user_id: subject.id, target_reason_code: 'QA_HOLD', target_operator_reference: 'QA-OP-001',
    })).response.ok, false, 'authenticated user placed a legal hold');
    const holdId = await required(rpc('loopedin_place_account_legal_hold', secretKey, {
      target_user_id: subject.id, target_reason_code: 'QA_HOLD', target_operator_reference: 'QA-OP-001',
    }), 'place service-role legal hold');
    assert.ok(Number.isSafeInteger(holdId));
    assert.deepEqual(await required(rpc('loopedin_get_account_deletion_status', subject.token), 'read status during legal hold'), deletion);
    assert.equal(await required(rpc('loopedin_release_account_legal_hold', secretKey, {
      target_user_id: subject.id, target_operator_reference: 'QA-OP-002',
    }), 'release service-role legal hold'), true);

    assert.equal(await required(rpc('loopedin_cancel_account_deletion', subject.token), 'cancel synthetic deletion'), true);
    assert.equal(await required(rpc('loopedin_get_account_deletion_status', subject.token), 'read canceled status'), null);
    assert.deepEqual(await required(table('loopedin_group_members', subject.token, `?group_id=eq.${groupId}&select=user_id,role&order=user_id.asc`), 'read restored roles'), rolesBefore);
    assert.equal((await required(table('loopedin_event_media', subject.token, `?id=eq.${mediaId}&select=id`), 'read restored media')).length, 1);
    const restoredSigned = await required(signObject(subject.token, storagePath), 'sign restored private media');
    assert.equal(typeof restoredSigned?.signedURL, 'string', 'restored private media signed URL missing');
    const restoredObject = await downloadObject(subject.token, storagePath);
    assert.equal(
      crypto.createHash('sha256').update(restoredObject).digest('hex'),
      crypto.createHash('sha256').update(PNG).digest('hex'),
      'restored private media hash mismatch',
    );

    await required(rpc('loopedin_request_account_deletion', subject.token), 'request deletion for expired boundary');
    const [expired] = dbQuery(`
      update loopedin_private.loopedin_account_deletion_requests
      set requested_at = now() - interval '31 days',
          purge_after = now() - interval '1 day',
          backup_expires_after = now() + interval '29 days'
      where user_id = '${subject.id}'::uuid and status = 'pending'
      returning purge_after < now() as expired;
    `, 'advance synthetic recovery boundary');
    assert.equal(expired?.expired, true, 'synthetic recovery boundary did not expire');
    const expiredStatus = await required(rpc('loopedin_get_account_deletion_status', subject.token), 'read expired lifecycle status');
    assert.equal(expiredStatus.status, 'pending');
    const expiredCancel = await rpc('loopedin_cancel_account_deletion', subject.token);
    assert.equal(expiredCancel.response.ok, false, 'expired deletion request was canceled');
    assert.match(String(expiredCancel.body?.message), /recovery period/i);
    assert.equal((await required(table('loopedin_groups', outsider.token, `?id=eq.${groupId}&select=id`), 'verify outsider remained denied')).length, 0);
    assert.equal(await required(rpc('loopedin_get_account_deletion_status', outsider.token), 'verify outsider lifecycle status'), null);
    assert.equal((await required(table('loopedin_profiles', outsider.token, `?id=eq.${outsider.id}&select=id`), 'verify outsider account remained active')).length, 1);

    const lifecycleRows = dbQuery(`
      select action from loopedin_private.loopedin_account_lifecycle_records
      where user_id = '${subject.id}'::uuid order by id;
    `, 'verify synthetic lifecycle records');
    assert.deepEqual(lifecycleRows.map((row) => row.action), [
      'deletion_requested', 'legal_hold_placed', 'legal_hold_released', 'deletion_canceled', 'deletion_requested',
    ]);
    summary = {
      runId, ownerTransferRequired: true, immediateDatabaseDenial: true, immediateRpcDenial: true,
      immediateStorageDenial: true, graceDays: 30, backupRetentionDays: 30,
      cancellationRestoredAccess: true, expiredCancellationDenied: true,
      legalHoldServiceRoleOnly: true, outsiderDenied: true,
    };
  } catch (error) {
    primaryError = error;
  } finally {
    try {
      await cleanup(runId, users, storagePath);
      const protectedAfter = await protectedFingerprint(qaUserIds);
      if (protectedBefore && protectedAfter !== protectedBefore) throw new Error('protected non-QA state changed');
      if (summary) console.log(JSON.stringify({ ...summary, protectedStateUnchanged: true, residue: 0 }));
    } catch (cleanupError) {
      primaryError = new Error(primaryError ? `${redact(primaryError)}; cleanup failed` : `cleanup failed: ${redact(cleanupError)}`);
    }
  }
  if (primaryError) throw primaryError;
}

try {
  await run();
} catch (error) {
  console.error(`hosted staging account lifecycle QA failed: ${redact(error)}`);
  process.exitCode = 1;
}
