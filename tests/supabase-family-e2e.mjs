import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
assert.ok(url && anonKey && serviceKey, 'local Supabase URL and keys are required');
assert.ok(['127.0.0.1', 'localhost', '::1'].includes(new URL(url).hostname), 'this destructive test only runs against loopback Supabase');

const run = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const password = 'Local-only-family-test-42!';
const bucket = 'loopedin-event-media';
const users = [];
const groups = [];
const paths = new Set();
const allPaths = new Set();

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
  const email = `${name}-${run}@loopedin.test`;
  const created = await ok(request('/auth/v1/signup', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, data: { display_name: name } }),
  }), `signup ${name}`);
  const login = await ok(request('/auth/v1/token?grant_type=password', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
  }), `login ${name}`);
  assert.equal(login.user.id, created.user.id);
  const user = { id: login.user.id, email, token: login.access_token };
  users.push(user);
  return user;
}

function rpc(name, token, body) {
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

async function createGroup(actor, name, key = crypto.randomUUID()) {
  const group = await ok(rpc('loopedin_create_group', actor.token, {
    target_name: name, target_description: 'Private family plans', target_kind: 'family', target_creation_key: key,
  }), `create ${name}`);
  groups.push(group.id);
  return { ...group, key };
}

function randomToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function createInvite(owner, groupId, email, token = randomToken()) {
  const result = await ok(rpc('loopedin_create_group_invite', owner.token, { target_group_id: groupId, target_email: email, target_token: token }), 'create invite');
  assert.equal('token' in result, false, 'database returned invitation token material');
  return { ...result, token };
}

async function upload(token, path) {
  return request(`/storage/v1/object/${bucket}/${path}`, {
    token, method: 'POST', headers: { 'Content-Type': 'image/png', 'x-upsert': 'false' },
    body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl5kAAAAASUVORK5CYII=', 'base64'),
  });
}

async function removeObject(token, path) {
  return request(`/storage/v1/object/${bucket}`, { token, method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: [path] }) });
}

let alex; let maya; let jordan; let outsider; let family; let privateGroup; let photo;
try {
  alex = await signup('Alex'); maya = await signup('Maya'); jordan = await signup('Jordan'); outsider = await signup('Outsider');
  const wrongPassword = await request('/auth/v1/token?grant_type=password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: alex.email, password: 'wrong-password' }) });
  assert.equal(wrongPassword.response.ok, false);
  assert.equal(await ok(rpc('loopedin_can_create_group', alex.token, {}), 'unprovisioned creator status'), false);
  assert.equal(await ok(rpc('loopedin_can_create_group', outsider.token, {}), 'outsider creator status'), false);
  assert.equal((await rpc('loopedin_create_group', outsider.token, { target_name: 'Unauthorized family', target_description: '', target_kind: 'family', target_creation_key: crypto.randomUUID() })).response.ok, false);
  assert.equal((await ok(table('loopedin_groups', outsider.token, '?select=id'), 'unprovisioned protected data')).length, 0);

  const malformedGroupId = crypto.randomUUID();
  sql(`alter table public.loopedin_groups disable trigger loopedin_groups_one_owner; insert into public.loopedin_groups(id,name,description,kind,created_by) values ('${malformedGroupId}','Malformed owner fixture','','family','${alex.id}'); alter table public.loopedin_groups enable trigger loopedin_groups_one_owner;`);
  const migrationSql = readFileSync('supabase/migrations/20260714120000_loopedin_group_invitation_lifecycle.sql', 'utf8');
  const preflight = spawnSync('docker', ['exec', '-i', 'supabase_db_family-loop', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], { input: `begin;\n${migrationSql}\nrollback;`, encoding: 'utf8' });
  assert.notEqual(preflight.status, 0, 'one-owner preflight accepted a malformed existing group');
  assert.match(preflight.stderr, /Cannot enforce one-owner invariant/);
  sql(`alter table public.loopedin_groups disable trigger loopedin_groups_one_owner; delete from public.loopedin_groups where id='${malformedGroupId}'; alter table public.loopedin_groups enable trigger loopedin_groups_one_owner;`);

  sql(`insert into loopedin_private.loopedin_group_creation_entitlements(user_id) values ('${alex.id}');`);
  assert.equal(await ok(rpc('loopedin_can_create_group', alex.token, {}), 'provisioned creator status'), true);
  assert.equal(sql(`select has_table_privilege('authenticated','loopedin_private.loopedin_group_creation_entitlements','select') or has_table_privilege('authenticated','loopedin_private.loopedin_group_creation_entitlements','insert') or has_table_privilege('authenticated','loopedin_private.loopedin_group_creation_entitlements','update');`), 'f');

  const key = crypto.randomUUID();
  family = await createGroup(alex, 'Jones Family', key);
  assert.equal(await ok(rpc('loopedin_can_create_group', alex.token, {}), 'consumed creator status'), false);
  assert.equal(sql(`select (consumed_at is not null and group_id='${family.id}') from loopedin_private.loopedin_group_creation_entitlements where user_id='${alex.id}';`), 't');
  const replayed = await ok(rpc('loopedin_create_group', alex.token, { target_name: 'Jones Family', target_description: 'Private family plans', target_kind: 'family', target_creation_key: key }), 'idempotent group replay');
  assert.equal(replayed.id, family.id);
  assert.equal((await rpc('loopedin_create_group', alex.token, { target_name: 'Conflicting replay', target_description: '', target_kind: 'friends', target_creation_key: key })).response.ok, false);
  assert.equal((await ok(table('loopedin_group_members', alex.token, `?group_id=eq.${family.id}&select=user_id,role`), 'sole owner')).length, 1);
  const beforeInvalid = Number(sql(`select count(*) from public.loopedin_groups where created_by='${alex.id}';`));
  const invalidCreate = await rpc('loopedin_create_group', alex.token, { target_name: 'Broken', target_description: '', target_kind: 'invalid', target_creation_key: crypto.randomUUID() });
  assert.equal(invalidCreate.response.ok, false);
  assert.equal(Number(sql(`select count(*) from public.loopedin_groups where created_by='${alex.id}';`)), beforeInvalid);

  const mayaInvite = await createInvite(alex, family.id, maya.email.toUpperCase());
  assert.equal(mayaInvite.ok, true);
  const anonymousContext = await ok(rpc('loopedin_validate_group_invite', anonKey, { target_token: mayaInvite.token }), 'anonymous valid invite');
  assert.equal(anonymousContext.code, 'ready');
  assert.equal(anonymousContext.groupName, 'Jones Family');
  assert.equal(anonymousContext.inviterName, 'Alex');
  assert.match(anonymousContext.maskedEmail, /^m\*{3}@/);
  assert.deepEqual(Object.keys(anonymousContext).sort(), ['code', 'expiresAt', 'groupId', 'groupName', 'inviterName', 'maskedEmail', 'ok'].sort());
  assert.deepEqual(await ok(rpc('loopedin_validate_group_invite', anonKey, { target_token: randomToken() }), 'anonymous invalid invite'), { code: 'unavailable', ok: false });
  const matchedEmail = await ok(rpc('loopedin_match_group_invite_email', anonKey, { target_token: mayaInvite.token, target_email: maya.email.toUpperCase() }), 'matching invitation email');
  assert.deepEqual(matchedEmail, { code: 'ready', ok: true });
  const wrongEmail = await ok(rpc('loopedin_match_group_invite_email', anonKey, { target_token: mayaInvite.token, target_email: outsider.email }), 'wrong invitation email');
  const unknownEmail = await ok(rpc('loopedin_match_group_invite_email', anonKey, { target_token: mayaInvite.token, target_email: `unknown-${run}@loopedin.test` }), 'unknown invitation email');
  const badToken = await ok(rpc('loopedin_match_group_invite_email', anonKey, { target_token: randomToken(), target_email: outsider.email }), 'unknown invitation token');
  assert.deepEqual(wrongEmail, { code: 'unavailable', ok: false });
  assert.deepEqual(unknownEmail, wrongEmail);
  assert.deepEqual(badToken, wrongEmail);
  assert.deepEqual(await ok(rpc('loopedin_match_group_invite_email', anonKey, { target_token: null, target_email: 'not-an-email' }), 'malformed invite match input'), { code: 'input', ok: false });
  assert.equal((await ok(rpc('loopedin_accept_group_invite', outsider.token, { target_token: mayaInvite.token }), 'wrong account accept')).code, 'unavailable');
  const responseLossRetry = await createInvite(alex, family.id, maya.email, mayaInvite.token);
  assert.equal(responseLossRetry.invitationId, mayaInvite.invitationId);
  assert.equal(responseLossRetry.code, 'existing');
  assert.equal((await ok(rpc('loopedin_accept_group_invite', maya.token, { target_token: mayaInvite.token }), 'Maya accepts')).code, 'joined');
  assert.equal((await ok(rpc('loopedin_accept_group_invite', maya.token, { target_token: mayaInvite.token }), 'Maya replay accepts')).code, 'joined');
  assert.deepEqual(await ok(rpc('loopedin_match_group_invite_email', anonKey, { target_token: mayaInvite.token, target_email: maya.email }), 'used invite unavailable'), { code: 'unavailable', ok: false });

  const revoked = await createInvite(alex, family.id, jordan.email);
  const [sameRetryA, sameRetryB] = await Promise.all([
    createInvite(alex, family.id, jordan.email, revoked.token),
    createInvite(alex, family.id, jordan.email.toUpperCase(), revoked.token),
  ]);
  assert.equal(sameRetryA.invitationId, revoked.invitationId);
  assert.equal(sameRetryB.invitationId, revoked.invitationId);
  const duplicate = await createInvite(alex, family.id, jordan.email, randomToken());
  assert.equal(duplicate.code, 'already_pending');
  await ok(rpc('loopedin_revoke_group_invite', alex.token, { target_invitation_id: revoked.invitationId }), 'revoke invite');
  assert.equal((await ok(rpc('loopedin_revoke_group_invite', alex.token, { target_invitation_id: revoked.invitationId }), 'revoke replay')).code, 'revoked');
  assert.deepEqual(await ok(rpc('loopedin_match_group_invite_email', anonKey, { target_token: revoked.token, target_email: jordan.email }), 'revoked invite unavailable'), { code: 'unavailable', ok: false });
  assert.equal((await ok(rpc('loopedin_accept_group_invite', jordan.token, { target_token: revoked.token }), 'revoked unavailable')).code, 'unavailable');
  const declined = await createInvite(alex, family.id, jordan.email);
  assert.equal((await ok(rpc('loopedin_decline_group_invite', jordan.token, { target_token: declined.token }), 'decline invite')).code, 'declined');
  assert.equal((await ok(rpc('loopedin_decline_group_invite', jordan.token, { target_token: declined.token }), 'decline replay')).code, 'declined');
  const expired = await createInvite(alex, family.id, jordan.email);
  sql(`update public.loopedin_group_invitations set created_at=now()-interval '8 days', expires_at=now()-interval '1 second' where id='${expired.invitationId}';`);
  assert.equal((await ok(rpc('loopedin_validate_group_invite', jordan.token, { target_token: expired.token }), 'expired unavailable')).code, 'unavailable');
  assert.deepEqual(await ok(rpc('loopedin_match_group_invite_email', anonKey, { target_token: expired.token, target_email: jordan.email }), 'expired invite match unavailable'), { code: 'unavailable', ok: false });
  const accepted = await createInvite(alex, family.id, jordan.email);
  await ok(rpc('loopedin_accept_group_invite', jordan.token, { target_token: accepted.token }), 'Jordan accepts');
  assert.equal((await ok(rpc('loopedin_revoke_group_invite', alex.token, { target_invitation_id: accepted.invitationId }), 'accepted invite is not revocable')).code, 'not_pending');
  const parallelEmail = `parallel-${run}@loopedin.test`;
  const parallel = await Promise.all([
    createInvite(alex, family.id, parallelEmail, randomToken()),
    createInvite(alex, family.id, parallelEmail.toUpperCase(), randomToken()),
  ]);
  assert.deepEqual(parallel.map((invite) => invite.code).sort(), ['already_pending', 'created']);
  const parallelWinner = parallel.find((invite) => invite.code === 'created');
  await ok(rpc('loopedin_revoke_group_invite', alex.token, { target_invitation_id: parallelWinner.invitationId }), 'revoke concurrent winner');
  const listedInvites = await ok(rpc('loopedin_list_group_invites', alex.token, { target_group_id: family.id }), 'owner lists invites');
  assert.equal(listedInvites.length, 6);
  assert.ok(listedInvites.some((invite) => invite.status === 'accepted'));
  assert.ok(listedInvites.some((invite) => invite.status === 'declined'));
  assert.ok(listedInvites.some((invite) => invite.status === 'revoked'));
  assert.ok(listedInvites.some((invite) => invite.status === 'expired'));
  assert.equal((await rpc('loopedin_list_group_invites', maya.token, { target_group_id: family.id })).body.length, 0);
  assert.equal((await table('loopedin_group_invitations', alex.token, '?select=*')).response.ok, false, 'owner read stored invite hashes directly');

  const leavingInvite = await createInvite(alex, family.id, outsider.email);
  assert.equal((await ok(rpc('loopedin_revoke_group_invite', maya.token, { target_invitation_id: leavingInvite.invitationId }), 'member cannot revoke')).code, 'unavailable');
  sql(`update auth.users set email_confirmed_at=null where id='${outsider.id}';`);
  assert.equal((await ok(rpc('loopedin_decline_group_invite', outsider.token, { target_token: leavingInvite.token }), 'unverified decline denied')).code, 'unavailable');
  assert.equal((await ok(rpc('loopedin_accept_group_invite', outsider.token, { target_token: leavingInvite.token }), 'unverified email denied')).code, 'unavailable');
  sql(`update auth.users set email_confirmed_at=now() where id='${outsider.id}';`);
  await ok(rpc('loopedin_accept_group_invite', outsider.token, { target_token: leavingInvite.token }), 'temporary member accepts');
  assert.equal((await ok(rpc('loopedin_leave_group', outsider.token, { target_group_id: family.id }), 'member leaves')).code, 'left');
  assert.equal((await ok(table('loopedin_groups', outsider.token, `?id=eq.${family.id}&select=id`), 'leave revokes access')).length, 0);

  const genericMemberWrite = await table('loopedin_group_members', alex.token, '', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ group_id: family.id, user_id: outsider.id, role: 'member' }) });
  assert.equal(genericMemberWrite.response.ok, false);
  const selfPromotion = await table('loopedin_group_members', maya.token, `?group_id=eq.${family.id}&user_id=eq.${maya.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'owner' }) });
  assert.equal(selfPromotion.response.ok, false);
  sql(`insert into loopedin_private.loopedin_group_creation_entitlements(user_id) values ('${outsider.id}');`);
  privateGroup = await createGroup(outsider, 'Outsider Family');

  const eventRows = [];
  for (const [actor, title, offset] of [[alex, 'Door County', 2], [maya, 'Yellowstone', 5], [jordan, 'Lake Geneva', -5]]) {
    const starts = new Date(Date.now() + offset * 86400000);
    const event = await ok(table('loopedin_events', actor.token, '?select=*', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ group_id: family.id, created_by: actor.id, title, starts_at: starts.toISOString(), ends_at: new Date(starts.getTime() + 7200000).toISOString(), location: 'Wisconsin', description: `${title} family trip` }),
    }), `create ${title}`);
    eventRows.push(event[0]);
  }
  const privateEvent = (await ok(table('loopedin_events', outsider.token, '?select=*', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify({ group_id: privateGroup.id, created_by: outsider.id, title: 'Private', starts_at: new Date(Date.now() + 86400000).toISOString(), ends_at: new Date(Date.now() + 90000000).toISOString(), location: '', description: '' }) }), 'create isolated event'))[0];
  for (const actor of [alex, maya, jordan]) assert.equal((await ok(table('loopedin_events', actor.token, `?group_id=eq.${family.id}&select=id`), 'family event list')).length, 3);
  assert.equal((await ok(table('loopedin_events', alex.token, `?id=eq.${privateEvent.id}&select=id`), 'cross-family event isolation')).length, 0);

  const lake = eventRows[2];
  for (const [actor, status] of [[alex, 'going'], [maya, 'maybe'], [jordan, 'declined']]) {
    await ok(table('loopedin_rsvps', actor.token, '?on_conflict=event_id,user_id&select=*', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify({ event_id: lake.id, user_id: actor.id, person_name: actor.email.split('@')[0], status }) }), 'upsert RSVP');
    await ok(table('loopedin_event_messages', actor.token, '?select=*', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify({ event_id: lake.id, author_id: actor.id, body: `${actor.email.split('@')[0]} is ready` }) }), 'send comment');
  }
  assert.equal((await ok(table('loopedin_rsvps', maya.token, `?event_id=eq.${lake.id}&select=*`), 'shared RSVPs')).length, 3);
  assert.equal((await ok(table('loopedin_event_messages', jordan.token, `?event_id=eq.${lake.id}&select=*`), 'shared comments')).length, 3);
  const spoof = await table('loopedin_rsvps', maya.token, '', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event_id: lake.id, user_id: outsider.id, person_name: 'Spoof', status: 'going' }) });
  assert.equal(spoof.response.ok, false);

  const path = `${lake.id}/${jordan.id}/${crypto.randomUUID()}.png`;
  const pending = await ok(rpc('loopedin_begin_media_upload', jordan.token, { target_event_id: lake.id, target_storage_path: path, target_caption: 'Lake day', target_alt_text: 'Family at the lake', target_source_name: null, target_source_url: null, target_creator_name: null, target_creator_url: null }), 'begin photo');
  await ok(upload(jordan.token, path), 'upload photo'); paths.add(path); allPaths.add(path);
  photo = await ok(rpc('loopedin_activate_media', jordan.token, { target_media_id: pending.id }), 'activate photo');
  await ok(request(`/storage/v1/object/authenticated/${bucket}/${path}`, { token: maya.token }), 'member reads photo');
  assert.equal((await request(`/storage/v1/object/authenticated/${bucket}/${path}`, { token: outsider.token })).response.ok, false);
  assert.equal((await rpc('loopedin_claim_media_deletion', maya.token, { target_media_id: photo.id })).response.ok, false);

  sql(`insert into public.loopedin_notifications(user_id,kind,title,body,event_id,group_id) values ('${alex.id}','message','Lake update','Jordan commented','${lake.id}','${family.id}'),('${maya.id}','media','New photo','Jordan shared a photo','${lake.id}','${family.id}'),('${jordan.id}','event_update','Trip update','The plan changed','${lake.id}','${family.id}');`);
  for (const actor of [alex, maya, jordan]) assert.equal((await ok(table('loopedin_notifications', actor.token, '?select=*'), 'own notification')).length, 1);
  assert.equal((await ok(table('loopedin_notifications', outsider.token, '?select=*'), 'outsider notifications')).length, 0);
  const mayaNotification = (await ok(table('loopedin_notifications', maya.token, '?select=id,read'), 'Maya notification'))[0];
  await ok(table('loopedin_notifications', maya.token, `?id=eq.${mayaNotification.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify({ read: true }) }), 'mark own notification read');
  assert.equal((await ok(table('loopedin_notifications', maya.token, `?id=eq.${mayaNotification.id}&select=read`), 'read state'))[0].read, true);
  assert.equal((await table('loopedin_notifications', maya.token, `?id=eq.${mayaNotification.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Tampered' }) })).response.ok, false, 'notification update exceeded read column');

  await assert.rejects(async () => ok(rpc('loopedin_leave_group', alex.token, { target_group_id: family.id }), 'owner cannot leave'), /Transfer ownership/);
  const transferRace = await Promise.all([
    rpc('loopedin_transfer_group_ownership', alex.token, { target_group_id: family.id, target_user_id: maya.id }),
    rpc('loopedin_transfer_group_ownership', alex.token, { target_group_id: family.id, target_user_id: jordan.id }),
  ]);
  assert.equal(transferRace.filter((result) => result.response.ok).length, 1, 'ownership race did not choose exactly one winner');
  const raceWinner = transferRace[0].response.ok ? maya : jordan;
  assert.equal(sql(`select count(*) from public.loopedin_group_members where group_id='${family.id}' and role='owner';`), '1');
  await ok(rpc('loopedin_transfer_group_ownership', raceWinner.token, { target_group_id: family.id, target_user_id: alex.id }), 'race winner transfers back');
  await ok(rpc('loopedin_transfer_group_ownership', alex.token, { target_group_id: family.id, target_user_id: maya.id }), 'transfer to Maya');
  assert.equal(sql(`select count(*) from public.loopedin_group_members where group_id='${family.id}' and role='owner';`), '1');
  assert.equal((await rpc('loopedin_remove_group_member', alex.token, { target_group_id: family.id, target_user_id: jordan.id })).response.ok, false);
  await ok(rpc('loopedin_transfer_group_ownership', maya.token, { target_group_id: family.id, target_user_id: alex.id }), 'transfer back to Alex');
  await assert.rejects(async () => ok(rpc('loopedin_remove_group_member', alex.token, { target_group_id: family.id, target_user_id: alex.id }), 'cannot remove owner'), /Transfer ownership/);

  await ok(rpc('loopedin_claim_media_deletion', alex.token, { target_media_id: photo.id }), 'owner claims photo');
  await ok(removeObject(alex.token, path), 'owner removes photo'); paths.delete(path);
  await ok(rpc('loopedin_finalize_media_deletion', alex.token, { target_media_id: photo.id }), 'owner finalizes photo');
  await ok(rpc('loopedin_remove_group_member', alex.token, { target_group_id: family.id, target_user_id: jordan.id }), 'remove Jordan');
  assert.equal((await ok(table('loopedin_events', jordan.token, `?group_id=eq.${family.id}&select=id`), 'removed event access')).length, 0);
  assert.equal((await ok(table('loopedin_notifications', jordan.token, '?select=id'), 'removed notification access')).length, 0);
  assert.equal((await ok(table('loopedin_events', jordan.token, `?group_id=eq.${privateGroup.id}&select=id`), 'unrelated group remains isolated')).length, 0);

  const directOwnerDelete = await table('loopedin_group_members', alex.token, `?group_id=eq.${family.id}&user_id=eq.${alex.id}`, { method: 'DELETE' });
  assert.equal(directOwnerDelete.response.ok, false);
  assert.equal(sql(`select count(*) from public.loopedin_group_members where group_id='${family.id}' and role='owner';`), '1');
  assert.equal((await request(`/auth/v1/admin/users/${alex.id}`, { token: serviceKey, method: 'DELETE' })).response.ok, false, 'original creator deletion bypassed FK restriction');

  console.log('local Supabase family lifecycle: 4 sessions, invites, events, RSVP, comments, media, notifications, and isolation passed');
} finally {
  for (const path of paths) await removeObject(serviceKey, path).catch(() => undefined);
  if (groups.length || users.length) {
    const groupIds = groups.map((id) => `'${id}'`).join(',');
    const userIds = users.map((user) => `'${user.id}'`).join(',');
    sql(`${groupIds ? `delete from public.loopedin_groups where id in (${groupIds});` : ''}${userIds ? `delete from auth.users where id in (${userIds});` : ''}`);
    const exactPaths = [...allPaths].map((path) => `'${path}'`).join(',') || "'__no_test_path__'";
    const residue = sql(`select (select count(*) from auth.users where email like '%-${run}@loopedin.test') || ',' || (select count(*) from public.loopedin_groups where id in (${groupIds || "'00000000-0000-0000-0000-000000000000'"})) || ',' || (select count(*) from storage.objects where bucket_id='${bucket}' and name in (${exactPaths}));`);
    assert.equal(residue, '0,0,0', `test residue remained: ${residue}`);
  }
}
