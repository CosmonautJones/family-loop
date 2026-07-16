import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
assert.ok(url && anonKey && serviceKey, 'local Supabase URL and keys are required');
assert.ok(['127.0.0.1', 'localhost', '::1'].includes(new URL(url).hostname), 'this destructive test only runs against loopback Supabase');

const run = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const password = 'Local-only-lifecycle-42!';
const bucket = 'loopedin-event-media';
const users = [];
let groupId;
let creationRaceGroupId;
let eventId;
let mediaId;
let storagePath;

async function request(path, { token = anonKey, headers = {}, ...options } = {}) {
  const response = await fetch(`${url}${path}`, { ...options, headers: { apikey: anonKey, Authorization: `Bearer ${token}`, ...headers } });
  const text = await response.text();
  let body = text;
  try { body = text ? JSON.parse(text) : null; } catch {}
  return { response, body };
}

async function ok(promise, label) {
  const result = await promise;
  assert.ok(result.response.ok, `${label}: ${result.response.status} ${JSON.stringify(result.body)}`);
  return result.body;
}

async function signup(name) {
  const email = `${name.toLowerCase()}-${run}@loopedin.test`;
  const created = await ok(request('/auth/v1/signup', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, data: { display_name: name } }),
  }), `signup ${name}`);
  const login = await ok(request('/auth/v1/token?grant_type=password', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
  }), `login ${name}`);
  assert.equal(login.user.id, created.user.id);
  const user = { id: login.user.id, email, token: login.access_token };
  users.push(user);
  return user;
}

function rpc(name, token, body = {}) {
  return request(`/rest/v1/rpc/${name}`, { token, method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

function table(name, token, suffix = '', options = {}) {
  return request(`/rest/v1/${name}${suffix}`, { token, ...options });
}

function sql(statement) {
  const result = spawnSync('docker', ['exec', '-i', 'supabase_db_family-loop', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'], { input: statement, encoding: 'utf8' });
  assert.equal(result.status, 0, `local SQL failed: ${result.stderr}`);
  return result.stdout.trim();
}

async function upload(token, path) {
  return request(`/storage/v1/object/${bucket}/${path}`, {
    token, method: 'POST', headers: { 'Content-Type': 'image/png', 'x-upsert': 'false' },
    body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl5kAAAAASUVORK5CYII=', 'base64'),
  });
}

async function signObject(token, path) {
  return request(`/storage/v1/object/sign/${bucket}/${path}`, {
    token, method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn: 60 }),
  });
}

let originalOwner; let owner; let race; let outsider;
try {
  originalOwner = await signup('OriginalOwner');
  owner = await signup('Owner');
  race = await signup('RaceMember');
  outsider = await signup('Outsider');

  sql(`insert into loopedin_private.loopedin_group_creation_entitlements(user_id) values ('${originalOwner.id}');`);
  const creationKey = crypto.randomUUID();
  const group = await ok(rpc('loopedin_create_group', originalOwner.token, {
    target_name: 'Lifecycle Family', target_description: 'Synthetic lifecycle proof', target_kind: 'family', target_creation_key: creationKey,
  }), 'create family');
  groupId = group.id;
  sql(`insert into public.loopedin_group_members(group_id,user_id,role) values ('${groupId}','${owner.id}','member'),('${groupId}','${race.id}','member');`);

  const ownerBlocked = await rpc('loopedin_request_account_deletion', originalOwner.token);
  assert.equal(ownerBlocked.response.ok, false);
  assert.match(String(ownerBlocked.body?.message), /Transfer ownership/);

  await ok(rpc('loopedin_transfer_group_ownership', originalOwner.token, { target_group_id: groupId, target_user_id: owner.id }), 'transfer ownership');
  sql(`update auth.users set last_sign_in_at=now()-interval '1 hour' where id='${originalOwner.id}';`);
  const staleSessionRequest = await rpc('loopedin_request_account_deletion', originalOwner.token);
  assert.equal(staleSessionRequest.response.ok, false);
  assert.match(String(staleSessionRequest.body?.message), /Sign in again/);
  const reauthenticated = await ok(request('/auth/v1/token?grant_type=password', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: originalOwner.email, password }),
  }), 'reauthenticate deletion request');
  originalOwner.token = reauthenticated.access_token;

  const raceResults = await Promise.all([
    rpc('loopedin_request_account_deletion', race.token),
    rpc('loopedin_transfer_group_ownership', owner.token, { target_group_id: groupId, target_user_id: race.id }),
  ]);
  assert.equal(raceResults.filter((result) => result.response.ok).length, 1, 'concurrent request/transfer must have one winner');
  const raceStatus = await ok(rpc('loopedin_get_account_deletion_status', race.token), 'race status');
  if (raceStatus) {
    assert.equal(raceResults[1].response.ok, false, 'pending target accepted ownership');
    await ok(rpc('loopedin_cancel_account_deletion', race.token), 'cancel race request');
  } else {
    assert.equal(raceResults[0].response.ok, false, 'new owner requested deletion');
    await ok(rpc('loopedin_transfer_group_ownership', race.token, { target_group_id: groupId, target_user_id: owner.id }), 'restore race ownership');
  }

  sql(`insert into loopedin_private.loopedin_group_creation_entitlements(user_id) values ('${outsider.id}');`);
  const creationRaceResults = await Promise.all([
    rpc('loopedin_request_account_deletion', outsider.token),
    rpc('loopedin_create_group', outsider.token, {
      target_name: 'Creation race family', target_description: 'Synthetic lifecycle race proof', target_kind: 'family', target_creation_key: crypto.randomUUID(),
    }),
  ]);
  assert.equal(creationRaceResults.filter((result) => result.response.ok).length, 1, 'concurrent request/group creation must have one winner');
  const creationRaceStatus = await ok(rpc('loopedin_get_account_deletion_status', outsider.token), 'creation race status');
  if (creationRaceStatus) {
    assert.equal(creationRaceResults[1].response.ok, false, 'pending account created a family');
    await ok(rpc('loopedin_cancel_account_deletion', outsider.token), 'cancel creation race request');
  } else {
    assert.equal(creationRaceResults[0].response.ok, false, 'new family owner requested deletion');
    creationRaceGroupId = creationRaceResults[1].body.id;
  }
  assert.equal(sql(`select count(*) from loopedin_private.loopedin_account_deletion_requests request join public.loopedin_group_members member on member.user_id=request.user_id and member.role='owner' where request.status='pending' and request.user_id='${outsider.id}';`), '0');

  const operationKey = crypto.randomUUID();
  const startsAt = new Date(Date.now() + 86400000).toISOString();
  const createdEvent = await ok(rpc('loopedin_create_event', originalOwner.token, {
    target_group_id: groupId, target_title: 'Lifecycle trip', target_starts_at: startsAt,
    target_ends_at: new Date(Date.now() + 90000000).toISOString(), target_location: 'Wisconsin',
    target_description: 'Synthetic lifecycle trip', target_status_label: 'Open', target_visibility: 'group',
    target_timeline: [], target_cover_url: null, target_operation_key: operationKey,
  }), 'create event');
  eventId = createdEvent.id;
  const messageKey = crypto.randomUUID();
  await ok(rpc('loopedin_send_event_message', originalOwner.token, { target_event_id: eventId, target_body: 'Synthetic lifecycle comment', target_operation_key: messageKey }), 'create comment');
  await ok(table('loopedin_rsvps', originalOwner.token, '?select=*', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ event_id: eventId, user_id: originalOwner.id, person_name: 'OriginalOwner', status: 'going' }),
  }), 'create RSVP');
  await ok(table('loopedin_reminder_drafts', originalOwner.token, '?select=*', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ event_id: eventId, user_id: originalOwner.id, body: 'Morning of event', enabled: true }),
  }), 'create reminder');

  storagePath = `${eventId}/${originalOwner.id}/${crypto.randomUUID()}.png`;
  const pendingMedia = await ok(rpc('loopedin_begin_media_upload', originalOwner.token, {
    target_event_id: eventId, target_storage_path: storagePath, target_caption: 'Lifecycle photo', target_alt_text: 'Synthetic private family photo',
  }), 'begin media');
  mediaId = pendingMedia.id;
  await ok(upload(originalOwner.token, storagePath), 'upload media');
  await ok(rpc('loopedin_activate_media', originalOwner.token, { target_media_id: mediaId }), 'activate media');
  const signedBefore = await ok(signObject(originalOwner.token, storagePath), 'sign before request');
  assert.ok(signedBefore.signedURL || signedBefore.signedUrl);

  const deletion = await ok(rpc('loopedin_request_account_deletion', originalOwner.token), 'request deletion');
  assert.equal(deletion.status, 'pending');
  assert.equal(new Date(deletion.purgeAfter).getTime() - new Date(deletion.requestedAt).getTime(), 30 * 86400000);
  assert.equal(new Date(deletion.backupExpiresAfter).getTime() - new Date(deletion.purgeAfter).getTime(), 30 * 86400000);
  assert.deepEqual(await ok(rpc('loopedin_request_account_deletion', originalOwner.token), 'idempotent request'), deletion);
  assert.deepEqual(await ok(rpc('loopedin_get_account_deletion_status', originalOwner.token), 'pending status'), deletion);

  for (const [name, suffix] of [
    ['loopedin_profiles', `?id=eq.${originalOwner.id}&select=id`],
    ['loopedin_groups', `?id=eq.${groupId}&select=id`],
    ['loopedin_events', `?id=eq.${eventId}&select=id`],
    ['loopedin_rsvps', `?event_id=eq.${eventId}&select=event_id`],
    ['loopedin_event_messages', `?event_id=eq.${eventId}&select=id`],
    ['loopedin_event_media', `?event_id=eq.${eventId}&select=id`],
    ['loopedin_notifications', '?select=id'],
    ['loopedin_reminder_drafts', `?event_id=eq.${eventId}&select=event_id`],
  ]) assert.deepEqual(await ok(table(name, originalOwner.token, suffix), `pending read ${name}`), []);

  assert.equal((await rpc('loopedin_can_create_group', originalOwner.token)).response.ok, false);
  assert.equal((await rpc('loopedin_list_group_invites', originalOwner.token, { target_group_id: groupId })).response.ok, false);
  assert.equal((await rpc('loopedin_create_group', originalOwner.token, {
    target_name: 'Lifecycle Family', target_description: 'Synthetic lifecycle proof', target_kind: 'family', target_creation_key: creationKey,
  })).response.ok, false, 'group replay exposed data');
  assert.equal((await rpc('loopedin_create_event', originalOwner.token, {
    target_group_id: groupId, target_title: 'Lifecycle trip', target_starts_at: startsAt,
    target_ends_at: new Date(Date.now() + 90000000).toISOString(), target_location: 'Wisconsin',
    target_description: 'Synthetic lifecycle trip', target_status_label: 'Open', target_visibility: 'group',
    target_timeline: [], target_cover_url: null, target_operation_key: operationKey,
  })).response.ok, false, 'event replay exposed data');
  assert.equal((await rpc('loopedin_send_event_message', originalOwner.token, { target_event_id: eventId, target_body: 'Synthetic lifecycle comment', target_operation_key: messageKey })).response.ok, false, 'message replay exposed data');
  assert.deepEqual(await ok(table('loopedin_profiles', originalOwner.token, `?id=eq.${originalOwner.id}&select=id`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify({ display_name: 'Changed' }) }), 'pending profile update'), []);
  assert.equal(sql(`select display_name from public.loopedin_profiles where id='${originalOwner.id}';`), 'OriginalOwner');
  assert.equal((await signObject(originalOwner.token, storagePath)).response.ok, false, 'pending account received a new signed media URL');
  assert.equal((await request(`/storage/v1/object/authenticated/${bucket}/${storagePath}`, { token: originalOwner.token })).response.ok, false, 'pending account downloaded private media');
  assert.equal((await rpc('loopedin_transfer_group_ownership', owner.token, { target_group_id: groupId, target_user_id: originalOwner.id })).response.ok, false, 'pending account received ownership');

  assert.equal((await rpc('loopedin_place_account_legal_hold', originalOwner.token, { target_user_id: originalOwner.id, target_reason_code: 'LEGAL_TEST', target_operator_reference: 'TEST-001' })).response.ok, false);
  const holdId = await ok(rpc('loopedin_place_account_legal_hold', serviceKey, { target_user_id: originalOwner.id, target_reason_code: 'LEGAL_TEST', target_operator_reference: 'TEST-001' }), 'place legal hold');
  assert.ok(Number.isSafeInteger(holdId));
  assert.deepEqual(await ok(table('loopedin_groups', originalOwner.token, `?id=eq.${groupId}&select=id`), 'hold keeps access denied'), []);
  assert.equal(await ok(rpc('loopedin_release_account_legal_hold', serviceKey, { target_user_id: originalOwner.id, target_operator_reference: 'TEST-002' }), 'release legal hold'), true);

  assert.equal(await ok(rpc('loopedin_cancel_account_deletion', originalOwner.token), 'cancel deletion'), true);
  assert.equal(await ok(rpc('loopedin_get_account_deletion_status', originalOwner.token), 'status after cancel'), null);
  assert.equal((await ok(table('loopedin_groups', originalOwner.token, `?id=eq.${groupId}&select=id`), 'access restored')).length, 1);
  assert.equal((await ok(table('loopedin_event_media', originalOwner.token, `?id=eq.${mediaId}&select=id`), 'media access restored')).length, 1);

  await ok(rpc('loopedin_request_account_deletion', originalOwner.token), 'request deletion again');
  sql(`update loopedin_private.loopedin_account_deletion_requests set requested_at=now()-interval '31 days', purge_after=now()-interval '1 day', backup_expires_after=now()+interval '29 days' where user_id='${originalOwner.id}' and status='pending';`);
  const expiredCancel = await rpc('loopedin_cancel_account_deletion', originalOwner.token);
  assert.equal(expiredCancel.response.ok, false);
  assert.match(String(expiredCancel.body?.message), /recovery period/i);
  assert.equal((await ok(table('loopedin_groups', outsider.token, `?id=eq.${groupId}&select=id`), 'outsider remains denied')).length, 0);

  const actions = sql(`select string_agg(action,',' order by id) from loopedin_private.loopedin_account_lifecycle_records where user_id='${originalOwner.id}';`);
  assert.equal(actions, 'deletion_requested,legal_hold_placed,legal_hold_released,deletion_canceled,deletion_requested');
  console.log('Local account lifecycle E2E passed: owner/transfer/creation race guards, 30-day grace, immediate DB/RPC/Storage denial, recovery, deadline, and legal-hold records.');
} finally {
  if (storagePath) await request(`/storage/v1/object/${bucket}`, { token: serviceKey, method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: [storagePath] }) }).catch(() => undefined);
  if (mediaId) sql(`delete from public.loopedin_event_media where id='${mediaId}';`);
  if (groupId) sql(`delete from public.loopedin_groups where id='${groupId}';`);
  if (creationRaceGroupId) sql(`delete from public.loopedin_groups where id='${creationRaceGroupId}';`);
  if (users.length) {
    const ids = users.map((user) => `'${user.id}'`).join(',');
    sql(`delete from loopedin_private.loopedin_account_lifecycle_records where user_id in (${ids}); delete from loopedin_private.loopedin_account_legal_holds where user_id in (${ids}); delete from loopedin_private.loopedin_account_deletion_requests where user_id in (${ids}); delete from auth.users where id in (${ids});`);
  }
}
