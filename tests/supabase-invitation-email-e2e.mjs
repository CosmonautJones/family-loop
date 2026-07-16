import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
assert.ok(url && anonKey, 'local Supabase URL and publishable key are required');
assert.ok(['127.0.0.1', 'localhost', '::1'].includes(new URL(url).hostname), 'this destructive test only runs against loopback Supabase');

const run = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const password = 'Local-only-invitation-email-42!';
const users = [];
let owner;

async function request(path, { token = anonKey, headers = {}, ...options } = {}) {
  const response = await fetch(`${url}${path}`, { ...options, headers: { apikey: anonKey, Authorization: `Bearer ${token}`, ...headers } });
  const text = await response.text();
  let body = text;
  try { body = text ? JSON.parse(text) : null; } catch {}
  return { response, body };
}

async function ok(promise, label) {
  const result = await promise;
  assert.ok(result.response.ok, `${label}: HTTP ${result.response.status}`);
  return result.body;
}

async function signup(name) {
  const email = `${name.toLowerCase()}-${run}@loopedin.test`;
  await ok(request('/auth/v1/signup', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, data: { display_name: name } }),
  }), `signup ${name}`);
  const login = await ok(request('/auth/v1/token?grant_type=password', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
  }), `login ${name}`);
  const user = { id: login.user.id, email, token: login.access_token };
  users.push(user);
  return user;
}

function rpc(name, token, body) {
  return request(`/rest/v1/rpc/${name}`, { token, method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

function sql(statement) {
  const result = spawnSync('docker', ['exec', '-i', 'supabase_db_family-loop', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'], { input: statement, encoding: 'utf8' });
  assert.equal(result.status, 0, 'local SQL command failed');
  return result.stdout.trim();
}

function tokenHex() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

try {
  owner = await signup('Owner');
  const member = await signup('Member');
  const outsider = await signup('Outsider');
  sql(`insert into loopedin_private.loopedin_group_creation_entitlements(user_id) values ('${owner.id}');`);
  const group = await ok(rpc('loopedin_create_group', owner.token, {
    target_name: `Email proof ${run}`, target_description: 'Local invitation delivery proof', target_kind: 'family', target_creation_key: crypto.randomUUID(),
  }), 'create family');
  sql(`insert into public.loopedin_group_members(group_id,user_id,role) values ('${group.id}','${member.id}','member');`);

  const inviteToken = tokenHex();
  const invite = await ok(rpc('loopedin_create_group_invite', owner.token, {
    target_group_id: group.id, target_email: `recipient-${run}@loopedin.test`, target_token: inviteToken,
  }), 'create invitation');
  const prepare = (actor, operationKey, token = inviteToken) => rpc('loopedin_prepare_invitation_email', actor, {
    target_invitation_id: invite.invitationId, target_token: token, target_operation_key: operationKey,
  });
  const finalize = (actor, deliveryId, outcome, token = inviteToken) => rpc('loopedin_finalize_invitation_email', actor, {
    target_delivery_id: deliveryId, target_token: token, target_outcome: outcome,
  });

  assert.equal((await prepare(anonKey, crypto.randomUUID())).response.ok, false, 'anonymous caller executed prepare RPC');
  assert.deepEqual(await ok(prepare(member.token, crypto.randomUUID()), 'member prepare denial'), { code: 'unavailable', ok: false });
  assert.deepEqual(await ok(prepare(outsider.token, crypto.randomUUID()), 'outsider prepare denial'), { code: 'unavailable', ok: false });
  assert.deepEqual(await ok(prepare(owner.token, crypto.randomUUID(), tokenHex()), 'wrong-token prepare denial'), { code: 'unavailable', ok: false });

  const operationKey = crypto.randomUUID();
  const prepared = await ok(prepare(owner.token, operationKey), 'owner prepares delivery');
  assert.equal(prepared.code, 'prepared');
  assert.deepEqual(Object.keys(prepared).sort(), ['code', 'deliveryId', 'groupName', 'inviteeEmail', 'inviterName', 'ok'].sort());
  const replayed = await ok(prepare(owner.token, operationKey), 'response-loss prepare replay');
  assert.equal(replayed.deliveryId, prepared.deliveryId);
  assert.equal((await ok(prepare(owner.token, crypto.randomUUID()), 'new-operation cooldown')).code, 'cooldown');
  assert.deepEqual(await ok(finalize(member.token, prepared.deliveryId, 'provider_accepted'), 'member finalize denial'), { code: 'unavailable', ok: false });
  assert.deepEqual(await ok(finalize(owner.token, prepared.deliveryId, 'provider_accepted', tokenHex()), 'wrong-token finalize denial'), { code: 'unavailable', ok: false });

  assert.equal((await ok(finalize(owner.token, prepared.deliveryId, 'provider_failed'), 'provider failure finalization')).code, 'provider_failed');
  assert.equal((await ok(rpc('loopedin_validate_group_invite', anonKey, { target_token: inviteToken }), 'link remains valid after provider failure')).code, 'ready');
  assert.equal((await ok(prepare(owner.token, operationKey), 'failed-operation cooldown')).code, 'cooldown');
  sql(`update loopedin_private.loopedin_invitation_email_deliveries set last_attempt_at=now()-interval '61 seconds' where id='${prepared.deliveryId}';`);
  const failedRetry = await ok(prepare(owner.token, operationKey), 'same-key retry after cooldown');
  assert.equal(failedRetry.deliveryId, prepared.deliveryId);
  assert.equal(sql(`select attempt_count from loopedin_private.loopedin_invitation_email_deliveries where id='${prepared.deliveryId}';`), '2');
  assert.equal((await ok(finalize(owner.token, prepared.deliveryId, 'provider_accepted'), 'provider acceptance finalization')).code, 'provider_accepted');
  assert.equal((await ok(prepare(owner.token, operationKey), 'accepted-operation replay')).code, 'provider_accepted');

  for (let attempt = 2; attempt <= 5; attempt += 1) {
    sql(`update loopedin_private.loopedin_invitation_email_deliveries set last_attempt_at=now()-interval '61 seconds' where invitation_id='${invite.invitationId}';`);
    const next = await ok(prepare(owner.token, crypto.randomUUID()), `bounded attempt ${attempt}`);
    assert.equal(next.code, 'prepared');
    await ok(finalize(owner.token, next.deliveryId, 'provider_failed'), `bounded failure ${attempt}`);
  }
  sql(`update loopedin_private.loopedin_invitation_email_deliveries set last_attempt_at=now()-interval '61 seconds' where invitation_id='${invite.invitationId}';`);
  assert.equal((await ok(prepare(owner.token, crypto.randomUUID()), '24-hour rate limit')).code, 'rate_limited');

  assert.equal(sql(`select exists (select 1 from (values ('select'),('insert'),('update'),('delete')) privilege(name) where has_table_privilege('authenticated','loopedin_private.loopedin_invitation_email_deliveries',privilege.name));`), 'f');
  assert.equal(sql(`select string_agg(column_name, ',' order by ordinal_position) from information_schema.columns where table_schema='loopedin_private' and table_name='loopedin_invitation_email_deliveries';`), 'id,invitation_id,requested_by,operation_key,status,prepared_at,last_attempt_at,attempt_count,finalized_at');

  sql(`insert into loopedin_private.loopedin_account_deletion_requests(user_id,purge_after,backup_expires_after) values ('${owner.id}',now()+interval '30 days',now()+interval '60 days');`);
  assert.equal((await prepare(owner.token, crypto.randomUUID())).response.ok, false, 'pending-deletion owner prepared email');
  sql(`delete from loopedin_private.loopedin_account_deletion_requests where user_id='${owner.id}';`);

  const revokeToken = tokenHex();
  const revokeInvite = await ok(rpc('loopedin_create_group_invite', owner.token, {
    target_group_id: group.id, target_email: `revoke-${run}@loopedin.test`, target_token: revokeToken,
  }), 'create revocation invitation');
  const revokeDelivery = await ok(rpc('loopedin_prepare_invitation_email', owner.token, {
    target_invitation_id: revokeInvite.invitationId, target_token: revokeToken, target_operation_key: crypto.randomUUID(),
  }), 'prepare revocation delivery');
  await ok(rpc('loopedin_revoke_group_invite', owner.token, { target_invitation_id: revokeInvite.invitationId }), 'revoke invitation');
  assert.deepEqual(await ok(rpc('loopedin_finalize_invitation_email', owner.token, {
    target_delivery_id: revokeDelivery.deliveryId, target_token: revokeToken, target_outcome: 'provider_accepted',
  }), 'revoked finalize denial'), { code: 'unavailable', ok: false });

  sql(`with ranked as (select id,row_number() over(order by id) position from loopedin_private.loopedin_invitation_email_deliveries where invitation_id='${invite.invitationId}') update loopedin_private.loopedin_invitation_email_deliveries delivery set attempt_count=case when ranked.position<=3 then 5 when ranked.position=4 then 3 else 1 end,last_attempt_at=now()-interval '2 hours' from ranked where delivery.id=ranked.id;`);
  sql(`update loopedin_private.loopedin_invitation_email_deliveries set last_attempt_at=now()-interval '25 hours' where id='${revokeDelivery.deliveryId}';`);
  assert.equal(sql(`select sum(attempt_count) from loopedin_private.loopedin_invitation_email_deliveries where invitation_id='${invite.invitationId}';`), '19');

  const secondGroupId = crypto.randomUUID();
  sql(`begin; insert into public.loopedin_groups(id,name,description,kind,created_by) values ('${secondGroupId}','Second email proof','Actor aggregate proof','family','${owner.id}'); insert into public.loopedin_group_members(group_id,user_id,role) values ('${secondGroupId}','${owner.id}','owner'); commit;`);
  const actorBoundToken = tokenHex();
  const actorBoundInvite = await ok(rpc('loopedin_create_group_invite', owner.token, {
    target_group_id: secondGroupId, target_email: `actor-bound-${run}@loopedin.test`, target_token: actorBoundToken,
  }), 'create actor-bound invitation');
  const actorBoundKey = crypto.randomUUID();
  const actorBoundDelivery = await ok(rpc('loopedin_prepare_invitation_email', owner.token, {
    target_invitation_id: actorBoundInvite.invitationId, target_token: actorBoundToken, target_operation_key: actorBoundKey,
  }), 'twentieth actor attempt');
  assert.equal(actorBoundDelivery.code, 'prepared');
  const actorRateToken = tokenHex();
  const actorRateInvite = await ok(rpc('loopedin_create_group_invite', owner.token, {
    target_group_id: secondGroupId, target_email: `actor-rate-${run}@loopedin.test`, target_token: actorRateToken,
  }), 'create actor-rate invitation');
  assert.equal((await ok(rpc('loopedin_prepare_invitation_email', owner.token, {
    target_invitation_id: actorRateInvite.invitationId, target_token: actorRateToken, target_operation_key: crypto.randomUUID(),
  }), 'owner aggregate rate limit')).code, 'rate_limited');

  sql(`update loopedin_private.loopedin_invitation_email_deliveries set last_attempt_at=now()-interval '24 hours' where id='${actorBoundDelivery.deliveryId}';`);
  assert.equal((await ok(rpc('loopedin_prepare_invitation_email', owner.token, {
    target_invitation_id: actorBoundInvite.invitationId, target_token: actorBoundToken, target_operation_key: actorBoundKey,
  }), 'stale uncertain delivery')).code, 'operator_review');

  assert.equal((await ok(rpc('loopedin_transfer_group_ownership', owner.token, { target_group_id: group.id, target_user_id: member.id }), 'transfer for group aggregate')).code, 'transferred');
  const groupBoundToken = tokenHex();
  const groupBoundInvite = await ok(rpc('loopedin_create_group_invite', member.token, {
    target_group_id: group.id, target_email: `group-bound-${run}@loopedin.test`, target_token: groupBoundToken,
  }), 'create group-bound invitation');
  assert.equal((await ok(rpc('loopedin_prepare_invitation_email', member.token, {
    target_invitation_id: groupBoundInvite.invitationId, target_token: groupBoundToken, target_operation_key: crypto.randomUUID(),
  }), 'twentieth group attempt')).code, 'prepared');
  const groupRateToken = tokenHex();
  const groupRateInvite = await ok(rpc('loopedin_create_group_invite', member.token, {
    target_group_id: group.id, target_email: `group-rate-${run}@loopedin.test`, target_token: groupRateToken,
  }), 'create group-rate invitation');
  assert.equal((await ok(rpc('loopedin_prepare_invitation_email', member.token, {
    target_invitation_id: groupRateInvite.invitationId, target_token: groupRateToken, target_operation_key: crypto.randomUUID(),
  }), 'group aggregate rate limit')).code, 'rate_limited');

  console.log(JSON.stringify({ invitationEmailDatabase: 'passed', anonymousDenied: true, memberDenied: true, outsiderDenied: true, exactInviteChecks: true, stableReplay: true, staleReplayOperatorReview: true, cooldown: true, invitationRateBound: true, ownerAggregateBound: true, groupAggregateBound: true, providerFailurePreservedLink: true, privateLedger: true }));
} finally {
  if (owner?.id) sql(`delete from public.loopedin_groups where created_by='${owner.id}';`);
  for (const user of users) sql(`delete from auth.users where id='${user.id}';`);
}
