import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
assert.ok(url && anonKey && serviceKey, 'local Supabase URL and keys are required');
const parsedUrl = new URL(url);
assert.ok(['127.0.0.1', 'localhost', '::1'].includes(parsedUrl.hostname), 'this destructive test only runs against local Supabase');

const bucket = 'loopedin-event-media';
const password = 'Local-only-test-password-42!';
const run = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

async function request(path, { token = anonKey, headers = {}, ...options } = {}) {
  const response = await fetch(`${url}${path}`, {
    ...options,
    headers: { apikey: anonKey, Authorization: `Bearer ${token}`, ...headers },
  });
  const text = await response.text();
  let body = text;
  try { body = text ? JSON.parse(text) : null; } catch {}
  return { response, body };
}

async function expectOk(result, label) {
  assert.ok(result.response.ok, `${label}: ${result.response.status} ${JSON.stringify(result.body)}`);
  return result.body;
}

async function signUp(name) {
  const body = await expectOk(await request('/auth/v1/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `${name}-${run}@loopedin.test`, password }),
  }), `sign up ${name}`);
  assert.ok(body.access_token && body.user?.id, `${name} signup did not return a session`);
  return { id: body.user.id, token: body.access_token };
}

async function rpc(name, token, body) {
  return request(`/rest/v1/rpc/${name}`, {
    token,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function upload(token, path) {
  return request(`/storage/v1/object/${bucket}/${path}`, {
    token,
    method: 'POST',
    headers: { 'Content-Type': 'image/png', 'x-upsert': 'false' },
    body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl5kAAAAASUVORK5CYII=', 'base64'),
  });
}

async function remove(token, path) {
  return request(`/storage/v1/object/${bucket}`, {
    token,
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefixes: [path] }),
  });
}

function row(body) {
  return Array.isArray(body) ? body[0] : body;
}

const users = [];
const uploadedPaths = new Set();
let owner;
let uploader;
let member;
let outsider;
let group;
let event;

try {
owner = await signUp('owner'); users.push(owner);
uploader = await signUp('uploader'); users.push(uploader);
member = await signUp('member'); users.push(member);
outsider = await signUp('outsider'); users.push(outsider);

group = { id: crypto.randomUUID() };
event = { id: crypto.randomUUID() };
const seedSql = `
  insert into public.loopedin_groups (id, name, description, kind, created_by)
  values ('${group.id}', 'Local media RLS test', '', 'family', '${owner.id}');
  insert into public.loopedin_group_members (group_id, user_id, role) values
    ('${group.id}', '${owner.id}', 'owner'),
    ('${group.id}', '${uploader.id}', 'member'),
    ('${group.id}', '${member.id}', 'member');
  insert into public.loopedin_events
    (id, group_id, created_by, title, starts_at, ends_at, location, description)
  values
    ('${event.id}', '${group.id}', '${uploader.id}', 'Local media RLS test', now() + interval '1 day', now() + interval '2 days', 'Local', '');
`;
const seeded = spawnSync('docker', ['exec', '-i', 'supabase_db_family-loop', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], {
  input: seedSql,
  encoding: 'utf8',
});
assert.equal(seeded.status, 0, `seed local database: ${seeded.stderr}`);

async function beginMetadata(suffix) {
  const path = `${event.id}/${uploader.id}/${crypto.randomUUID()}-${suffix}.png`;
  const pending = row(await expectOk(await rpc('loopedin_begin_media_upload', uploader.token, {
    target_event_id: event.id,
    target_storage_path: path,
    target_caption: 'Family moment',
    target_alt_text: 'Family members smiling together',
    target_source_name: null,
    target_source_url: null,
    target_creator_name: null,
    target_creator_url: null,
  }), 'begin upload'));
  assert.equal(pending.status, 'pending');
  return { id: pending.id, path };
}

async function beginUpload(suffix) {
  const pending = await beginMetadata(suffix);
  const { path } = pending;
  await expectOk(await upload(uploader.token, path), 'upload private object');
  uploadedPaths.add(path);
  return pending;
}

async function beginAndActivate(suffix) {
  const pending = await beginUpload(suffix);
  const active = row(await expectOk(await rpc('loopedin_activate_media', uploader.token, {
    target_media_id: pending.id,
  }), 'activate upload'));
  assert.equal(active.status, 'active');
  return { id: active.id, path: pending.path };
}

const first = await beginAndActivate('first');

const memberRows = await expectOk(await request(`/rest/v1/loopedin_event_media?id=eq.${first.id}&select=id,status`, {
  token: member.token,
}), 'member reads active metadata');
assert.equal(memberRows.length, 1);
const outsiderRows = await expectOk(await request(`/rest/v1/loopedin_event_media?id=eq.${first.id}&select=id`, {
  token: outsider.token,
}), 'outsider metadata query');
assert.equal(outsiderRows.length, 0);

await expectOk(await request(`/storage/v1/object/authenticated/${bucket}/${first.path}`, {
  token: member.token,
}), 'member reads active object');
const outsiderObject = await request(`/storage/v1/object/authenticated/${bucket}/${first.path}`, {
  token: outsider.token,
});
assert.equal(outsiderObject.response.ok, false, 'outsider read active object');

const memberClaim = await rpc('loopedin_claim_media_deletion', member.token, { target_media_id: first.id });
assert.equal(memberClaim.response.ok, false, 'ordinary member claimed another uploader photo');

const claimed = row(await expectOk(await rpc('loopedin_claim_media_deletion', owner.token, {
  target_media_id: first.id,
}), 'owner claims deletion'));
assert.equal(claimed.status, 'deleting');
await expectOk(await remove(owner.token, first.path), 'owner removes claimed object');
uploadedPaths.delete(first.path);
assert.equal(await expectOk(await rpc('loopedin_finalize_media_deletion', owner.token, {
  target_media_id: first.id,
}), 'owner finalizes deletion'), true);

const abortPath = `${event.id}/${uploader.id}/${crypto.randomUUID()}.png`;
const pending = row(await expectOk(await rpc('loopedin_begin_media_upload', uploader.token, {
  target_event_id: event.id,
  target_storage_path: abortPath,
  target_caption: '',
  target_alt_text: 'Pending upload',
  target_source_name: null,
  target_source_url: null,
  target_creator_name: null,
  target_creator_url: null,
}), 'begin abortable upload'));
assert.equal(await expectOk(await rpc('loopedin_abort_media_upload', uploader.token, {
  target_media_id: pending.id,
}), 'abort objectless upload'), true);

const race = await beginMetadata('abort-upload-race');
const [raceAbort, raceUpload] = await Promise.all([
  rpc('loopedin_abort_media_upload', uploader.token, { target_media_id: race.id }),
  upload(uploader.token, race.path),
]);
assert.notEqual(raceAbort.response.ok && raceUpload.response.ok, true, 'abort and Storage insert both committed');
if (raceUpload.response.ok) {
  uploadedPaths.add(race.path);
  await expectOk(await rpc('loopedin_activate_media', uploader.token, { target_media_id: race.id }), 'activate race winner');
  await expectOk(await rpc('loopedin_claim_media_deletion', uploader.token, { target_media_id: race.id }), 'uploader claims race object');
  await expectOk(await remove(uploader.token, race.path), 'uploader removes race object');
  uploadedPaths.delete(race.path);
  await expectOk(await rpc('loopedin_finalize_media_deletion', uploader.token, { target_media_id: race.id }), 'uploader finalizes race object');
} else {
  assert.equal(raceAbort.response.ok, true, 'neither side of the abort/upload race completed');
}

const directInsert = await request('/rest/v1/loopedin_event_media', {
  token: uploader.token,
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    event_id: event.id,
    storage_path: `${event.id}/${uploader.id}/${crypto.randomUUID()}.png`,
    caption: '',
    alt_text: 'Bypass attempt',
    uploaded_by: uploader.id,
  }),
});
assert.equal(directInsert.response.ok, false, 'generic metadata INSERT remained available');

const deepPath = await rpc('loopedin_begin_media_upload', uploader.token, {
  target_event_id: event.id,
  target_storage_path: `${event.id}/${uploader.id}/extra/${crypto.randomUUID()}.png`,
  target_caption: '',
  target_alt_text: 'Deep path attack',
  target_source_name: null,
  target_source_url: null,
  target_creator_name: null,
  target_creator_url: null,
});
assert.equal(deepPath.response.ok, false, 'deep Storage path was accepted');

const quotaPending = [];
for (let index = 0; index < 3; index += 1) quotaPending.push(await beginMetadata(`quota-${index}`));
const fourthPending = await rpc('loopedin_begin_media_upload', uploader.token, {
  target_event_id: event.id,
  target_storage_path: `${event.id}/${uploader.id}/${crypto.randomUUID()}-quota-4.png`,
  target_caption: '',
  target_alt_text: 'Quota attack',
  target_source_name: null,
  target_source_url: null,
  target_creator_name: null,
  target_creator_url: null,
});
assert.equal(fourthPending.response.ok, false, 'pending upload quota was not enforced');
for (const pendingUpload of quotaPending) {
  await expectOk(await rpc('loopedin_abort_media_upload', uploader.token, { target_media_id: pendingUpload.id }), 'cleanup quota upload');
}

const second = await beginUpload('removed-member-pending');
const claimThenRemove = await beginAndActivate('claim-then-remove');
await expectOk(await rpc('loopedin_claim_media_deletion', uploader.token, {
  target_media_id: claimThenRemove.id,
}), 'uploader claims before membership removal');
const blockedEventDelete = await request(`/rest/v1/loopedin_events?id=eq.${event.id}`, {
  token: owner.token,
  method: 'DELETE',
});
assert.equal(blockedEventDelete.response.ok, false, 'event deletion ignored unfinished media');
await expectOk(await request(`/rest/v1/loopedin_group_members?group_id=eq.${group.id}&user_id=eq.${uploader.id}`, {
  token: owner.token,
  method: 'DELETE',
}), 'remove uploader membership');
const removedClaim = await rpc('loopedin_claim_media_deletion', uploader.token, { target_media_id: second.id });
assert.equal(removedClaim.response.ok, false, 'removed uploader retained delete authority');
const removedClaimantRead = await request(`/storage/v1/object/authenticated/${bucket}/${claimThenRemove.path}`, {
  token: uploader.token,
});
assert.equal(removedClaimantRead.response.ok, false, 'removed deletion claimant retained object read access');
await expectOk(await remove(uploader.token, claimThenRemove.path), 'removed claimant finishes claimed deletion');
uploadedPaths.delete(claimThenRemove.path);
await expectOk(await rpc('loopedin_finalize_media_deletion', uploader.token, {
  target_media_id: claimThenRemove.id,
}), 'removed claimant finalizes claimed deletion');

const managerActivated = row(await expectOk(await rpc('loopedin_activate_media', owner.token, {
  target_media_id: second.id,
}), 'owner reconciles removed-uploader pending object'));
assert.equal(managerActivated.status, 'active');
await expectOk(await rpc('loopedin_claim_media_deletion', owner.token, { target_media_id: second.id }), 'owner claims removed-user media');
await expectOk(await remove(owner.token, second.path), 'owner removes removed-user object');
uploadedPaths.delete(second.path);
await expectOk(await rpc('loopedin_finalize_media_deletion', owner.token, { target_media_id: second.id }), 'owner finalizes removed-user media');

await expectOk(await request(`/rest/v1/loopedin_groups?id=eq.${group.id}`, {
  token: owner.token,
  method: 'DELETE',
}), 'cleanup test group');
for (const user of users) {
  await expectOk(await request(`/auth/v1/admin/users/${user.id}`, { token: serviceKey, method: 'DELETE' }), 'cleanup test user');
}

console.log('local Supabase media lifecycle: uploader/member/owner/outsider matrix passed');
} finally {
  for (const path of uploadedPaths) await remove(serviceKey, path).catch(() => undefined);
  if (group?.id) {
    const userIds = users.map((user) => `'${user.id}'`).join(',');
    const cleanupSql = `
      delete from public.loopedin_event_media where event_id = '${event?.id}';
      delete from public.loopedin_groups where id = '${group.id}';
      ${userIds ? `delete from auth.users where id in (${userIds});` : ''}
    `;
    spawnSync('docker', ['exec', '-i', 'supabase_db_family-loop', 'psql', '-U', 'postgres', '-d', 'postgres'], {
      input: cleanupSql,
      encoding: 'utf8',
    });
  }
}
