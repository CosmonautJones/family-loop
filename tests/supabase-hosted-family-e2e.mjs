import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../app/package.json', import.meta.url));
const { createClient } = require('@supabase/supabase-js');

const EXPECTED_PROJECT_REF = 'vkogznsfthirhxkqysza';
const QUARANTINED_PROJECT_REF = 'lzscofbvecgpchokxhyb';
const QA_MARKER = 'loopedin_hosted_family_qa';
const BUCKET = 'loopedin-event-media';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl5kAAAAASUVORK5CYII=', 'base64');
const ROLES = ['owner', 'member-a', 'member-b', 'outsider'];
const sensitiveValues = new Set();

const phase = process.argv[2];
const args = Object.fromEntries(process.argv.slice(3).reduce((pairs, value, index, all) => {
  if (value.startsWith('--')) pairs.push([value.slice(2), all[index + 1]]);
  return pairs;
}, []));
const projectRef = process.env.LOOPEDIN_HOSTED_PROJECT_REF;
const url = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;

assert.ok(['prepare', 'run'].includes(phase), 'phase must be prepare or run');
assert.equal(process.env.LOOPEDIN_HOSTED_STAGING_ACK, 'I_ACKNOWLEDGE_LOOPEDIN_STAGING_ONLY');
assert.equal(projectRef, EXPECTED_PROJECT_REF, 'unexpected hosted project');
assert.notEqual(projectRef, QUARANTINED_PROJECT_REF, 'quarantined project refused');
assert.equal(url, `https://${EXPECTED_PROJECT_REF}.supabase.co`, 'unexpected hosted URL');
assert.ok(publishableKey?.startsWith('sb_publishable_'), 'publishable key required');
assert.ok(secretKey?.startsWith('sb_secret_'), 'secret key required');

function randomPassword() {
  const value = `${crypto.randomBytes(36).toString('base64url')}Aa1!`;
  sensitiveValues.add(value);
  return value;
}

function randomToken() {
  const value = crypto.randomBytes(32).toString('hex');
  sensitiveValues.add(value);
  return value;
}

function validRunId(value) {
  assert.match(value, /^[a-z0-9][a-z0-9-]{7,47}$/, 'invalid run ID');
  return value;
}

function identityFor(runId, role) {
  const slug = runId.replaceAll('-', '').slice(-20);
  return {
    role,
    email: `loopedin-${role}-${slug}@loopedin.invalid`,
    displayName: `LoopedIn QA ${role}`,
  };
}

function markerFor(runId, role) {
  return { [QA_MARKER]: true, loopedin_qa_run_id: runId, loopedin_qa_role: role };
}

function isMarked(user, runId, role) {
  const metadata = user?.app_metadata ?? {};
  return metadata[QA_MARKER] === true
    && metadata.loopedin_qa_run_id === runId
    && metadata.loopedin_qa_role === role;
}

function redact(value) {
  let text = value instanceof Error ? value.message : String(value);
  for (const secret of [publishableKey, secretKey, ...sensitiveValues]) if (secret) text = text.replaceAll(secret, '[REDACTED]');
  return text
    .replace(/https?:\/\/[^\s]+/gi, '[REDACTED_URL]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED_TOKEN]')
    .replace(/\b[0-9a-f]{64}\b/gi, '[REDACTED_TOKEN]')
    .replace(/sb_(?:publishable|secret)_[A-Za-z0-9_-]+/g, '[REDACTED_KEY]');
}

function assertRpcResult(body, expectedOk, expectedCode, label) {
  assert.equal(body?.ok, expectedOk, `${label} ok mismatch`);
  assert.equal(body?.code, expectedCode, `${label} code mismatch`);
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

function rpc(name, token, body) {
  return request(`/rest/v1/rpc/${name}`, {
    token,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function table(name, token, suffix = '', options = {}) {
  return request(`/rest/v1/${name}${suffix}`, { token, ...options });
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical).sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
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

async function adminUsers() {
  const body = await required(request('/auth/v1/admin/users?page=1&per_page=1000', { token: secretKey }), 'list QA users');
  return Array.isArray(body) ? body : body.users ?? [];
}

async function upsertQaUser(runId, identity) {
  const users = await adminUsers();
  const existing = users.find((user) => user.email?.toLowerCase() === identity.email);
  if (existing && !isMarked(existing, runId, identity.role)) throw new Error('unmarked QA address collision');
  const payload = {
    email: identity.email,
    password: randomPassword(),
    email_confirm: true,
    user_metadata: { display_name: identity.displayName },
    app_metadata: markerFor(runId, identity.role),
  };
  const user = existing
    ? await required(request(`/auth/v1/admin/users/${existing.id}`, {
      token: secretKey, method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    }), 'refresh marked QA user')
    : await required(request('/auth/v1/admin/users', {
      token: secretKey, method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    }), 'create marked QA user');
  assert.ok(isMarked(user, runId, identity.role), 'QA user marker mismatch');
  return { ...identity, id: user.id };
}

async function prepare() {
  const runId = validRunId(args['run-id'] ?? `qa-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`);
  const identities = [];
  try {
    for (const role of ROLES) identities.push(await upsertQaUser(runId, identityFor(runId, role)));
    console.log(JSON.stringify({
      runId,
      ownerId: identities[0].id,
      memberAId: identities[1].id,
      memberBId: identities[2].id,
      outsiderId: identities[3].id,
      userCount: identities.length,
    }));
  } catch (error) {
    const listed = await adminUsers().catch(() => []);
    for (const user of listed.filter((candidate) => ROLES.some((role) => isMarked(candidate, runId, role)))) {
      await request(`/auth/v1/admin/users/${user.id}`, { token: secretKey, method: 'DELETE' }).catch(() => undefined);
    }
    throw error;
  }
}

async function loadRunUsers(runId) {
  const expectedIds = {
    owner: args['owner-id'],
    'member-a': args['member-a-id'],
    'member-b': args['member-b-id'],
    outsider: args['outsider-id'],
  };
  for (const id of Object.values(expectedIds)) assert.match(id ?? '', /^[0-9a-f-]{36}$/i, 'missing QA user ID');
  assert.equal(new Set(Object.values(expectedIds)).size, 4, 'QA user IDs must be distinct');
  const listed = await adminUsers();
  const users = {};
  for (const role of ROLES) {
    const identity = identityFor(runId, role);
    const user = listed.find((candidate) => candidate.id === expectedIds[role]);
    assert.ok(user && user.email?.toLowerCase() === identity.email && isMarked(user, runId, role), 'QA user identity mismatch');
    const password = randomPassword();
    await required(request(`/auth/v1/admin/users/${user.id}`, {
      token: secretKey,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, email_confirm: true, app_metadata: markerFor(runId, role) }),
    }), 'rotate QA password');
    const session = await required(request('/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: identity.email, password }),
    }), 'sign in QA user');
    assert.equal(session.user.id, user.id, 'QA session identity mismatch');
    users[role] = { ...identity, id: user.id, token: session.access_token };
  }
  return users;
}

async function createEvent(actor, groupId, title, offsetDays) {
  const startsAt = new Date(Date.now() + offsetDays * 86400000);
  return required(rpc('loopedin_create_event', actor.token, {
    target_group_id: groupId,
    target_title: title,
    target_starts_at: startsAt.toISOString(),
    target_ends_at: new Date(startsAt.getTime() + 7200000).toISOString(),
    target_location: 'LoopedIn QA location',
    target_description: 'Isolated hosted staging verification',
    target_status_label: offsetDays < 0 ? 'Completed' : 'Open',
    target_visibility: 'group',
    target_timeline: [],
    target_cover_url: null,
    target_operation_key: crypto.randomUUID(),
  }), 'create QA event');
}

async function inviteAndAccept(owner, member, outsider, groupId) {
  const token = randomToken();
  const created = await required(rpc('loopedin_create_group_invite', owner.token, {
    target_group_id: groupId, target_email: member.email, target_token: token,
  }), 'create QA invitation');
  assertRpcResult(created, true, 'created', 'create invitation');
  assert.equal('token' in created, false, 'invitation response exposed token');
  const preflight = await required(rpc('loopedin_validate_group_invite', publishableKey, { target_token: token }), 'validate QA invitation');
  assertRpcResult(preflight, true, 'ready', 'invitation preflight');
  const outsiderMatch = await required(rpc('loopedin_match_group_invite_email', publishableKey, {
    target_token: token, target_email: outsider.email,
  }), 'reject outsider invitation email');
  assertRpcResult(outsiderMatch, false, 'unavailable', 'outsider invitation email');
  const outsiderAccept = await required(rpc('loopedin_accept_group_invite', outsider.token, {
    target_token: token,
  }), 'reject outsider invitation acceptance');
  assertRpcResult(outsiderAccept, false, 'unavailable', 'outsider invitation acceptance');
  const outsiderMembership = await required(table(
    'loopedin_group_members', secretKey, `?group_id=eq.${groupId}&user_id=eq.${outsider.id}&select=user_id`,
  ), 'verify outsider remained outside family');
  assert.equal(outsiderMembership.length, 0, 'outsider joined through another recipient invitation');
  const match = await required(rpc('loopedin_match_group_invite_email', publishableKey, {
    target_token: token, target_email: member.email.toUpperCase(),
  }), 'match QA invitation email');
  assertRpcResult(match, true, 'ready', 'recipient invitation email');
  const accepted = await required(rpc('loopedin_accept_group_invite', member.token, { target_token: token }), 'accept QA invitation');
  assertRpcResult(accepted, true, 'joined', 'accept invitation');
}

async function realtimeInsert(token, eventId) {
  const client = createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
  await client.realtime.setAuth(token);
  let resolveChange;
  let rejectChange;
  let changeTimeout;
  const change = new Promise((resolve, reject) => { resolveChange = resolve; rejectChange = reject; });
  let resolveReady;
  let rejectReady;
  const ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
  const readyTimeout = setTimeout(() => rejectReady(new Error('bounded Realtime subscription timed out')), 60000);
  const channel = client.channel(`hosted-proof:${eventId}:${crypto.randomUUID()}`)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'loopedin_event_messages', filter: `event_id=eq.${eventId}`,
    }, () => {
      clearTimeout(changeTimeout);
      resolveChange();
    })
    .on('system', {}, (payload) => {
      if (payload.extension === 'postgres_changes' && payload.status === 'ok' && !changeTimeout) {
        clearTimeout(readyTimeout);
        changeTimeout = setTimeout(() => rejectChange(new Error('bounded Realtime observation timed out')), 60000);
        resolveReady();
      }
    });
  channel.subscribe((status) => {
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      clearTimeout(readyTimeout);
      rejectReady(new Error('Realtime subscription failed'));
    }
  });
  return {
    ready,
    change,
    close() { clearTimeout(readyTimeout); clearTimeout(changeTimeout); void client.removeChannel(channel); },
  };
}

async function cleanup(runId, users, groupId, paths) {
  const failures = [];
  for (const path of paths) {
    const removed = await request(`/storage/v1/object/${BUCKET}`, {
      token: secretKey, method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: [path] }),
    }).catch(() => null);
    if (!removed?.response.ok && removed?.response.status !== 404) failures.push('storage cleanup');
    const residue = await request(`/storage/v1/object/authenticated/${BUCKET}/${path}`, { token: secretKey }).catch(() => null);
    if (residue?.response.ok) failures.push('storage residue');
  }
  if (groupId) {
    const markedGroup = await table(
      'loopedin_groups', secretKey, `?id=eq.${groupId}&select=id,name,description,created_by`,
    ).catch(() => null);
    const row = markedGroup?.response.ok && markedGroup.body.length === 1 ? markedGroup.body[0] : null;
    if (row?.created_by !== users.owner.id
      || row?.name !== `LoopedIn Hosted QA ${runId}`
      || row?.description !== `loopedin-hosted-qa:${runId}`) {
      failures.push('group marker mismatch');
    } else {
      const removed = await table('loopedin_groups', secretKey, `?id=eq.${groupId}`, { method: 'DELETE' }).catch(() => null);
      if (!removed?.response.ok) failures.push('group cleanup');
    }
  }
  const listedBeforeDelete = await adminUsers().catch(() => []);
  for (const user of Object.values(users)) {
    const current = listedBeforeDelete.find((candidate) => candidate.id === user.id);
    if (!current) continue;
    if (!isMarked(current, runId, user.role) || current.email?.toLowerCase() !== identityFor(runId, user.role).email) {
      failures.push('user marker mismatch');
      continue;
    }
    const removed = await request(`/auth/v1/admin/users/${user.id}`, { token: secretKey, method: 'DELETE' }).catch(() => null);
    if (!removed?.response.ok && removed?.response.status !== 404) failures.push('user cleanup');
  }
  const remainingUsers = (await adminUsers().catch(() => [])).filter((user) => user.app_metadata?.loopedin_qa_run_id === runId);
  const userIds = Object.values(users).map((user) => user.id).filter(Boolean);
  const remainingProfiles = userIds.length
    ? await table('loopedin_profiles', secretKey, `?id=in.(${userIds.join(',')})&select=id`).catch(() => null)
    : null;
  const remainingGroup = groupId
    ? await table('loopedin_groups', secretKey, `?id=eq.${groupId}&select=id`).catch(() => null)
    : null;
  const remainingInvitations = groupId
    ? await table('loopedin_group_invitations', secretKey, `?group_id=eq.${groupId}&select=id`).catch(() => null)
    : null;
  const residue = {
    users: remainingUsers.length,
    profiles: remainingProfiles?.response.ok ? remainingProfiles.body.length : userIds.length ? -1 : 0,
    groups: remainingGroup?.response.ok ? remainingGroup.body.length : groupId ? -1 : 0,
    invitations: remainingInvitations?.response.ok ? remainingInvitations.body.length : groupId ? -1 : 0,
    objects: failures.includes('storage residue') ? -1 : 0,
  };
  if (Object.values(residue).some((count) => count !== 0)) failures.push('nonzero residue');
  if (failures.length) throw new Error([...new Set(failures)].join(', '));
  return residue;
}

async function run() {
  const runId = validRunId(args['run-id'] ?? '');
  let users = {
    owner: { id: args['owner-id'], role: 'owner' },
    'member-a': { id: args['member-a-id'], role: 'member-a' },
    'member-b': { id: args['member-b-id'], role: 'member-b' },
    outsider: { id: args['outsider-id'], role: 'outsider' },
  };
  const paths = new Set();
  let group;
  let realtime;
  let summary;
  let primaryError;
  let protectedBefore;
  const qaUserIds = new Set();
  try {
    users = await loadRunUsers(runId);
    for (const user of Object.values(users)) qaUserIds.add(user.id);
    protectedBefore = await protectedFingerprint(qaUserIds);
    const owner = users.owner;
    const memberA = users['member-a'];
    const memberB = users['member-b'];
    const outsider = users.outsider;
    assert.equal(await required(rpc('loopedin_can_create_group', owner.token, {}), 'check owner entitlement'), true, 'owner entitlement missing');
    assert.equal(await required(rpc('loopedin_can_create_group', outsider.token, {}), 'check outsider entitlement'), false, 'outsider unexpectedly entitled');
    group = await required(rpc('loopedin_create_group', owner.token, {
      target_name: `LoopedIn Hosted QA ${runId}`,
      target_description: `loopedin-hosted-qa:${runId}`,
      target_kind: 'family',
      target_creation_key: crypto.randomUUID(),
    }), 'create isolated QA family');
    await inviteAndAccept(owner, memberA, outsider, group.id);
    await inviteAndAccept(owner, memberB, outsider, group.id);

    const wrongMatch = await required(rpc('loopedin_match_group_invite_email', publishableKey, {
      target_token: randomToken(), target_email: outsider.email,
    }), 'check unavailable invitation');
    assertRpcResult(wrongMatch, false, 'unavailable', 'unknown invitation');
    const memberInvite = await rpc('loopedin_create_group_invite', memberA.token, {
      target_group_id: group.id, target_email: outsider.email, target_token: randomToken(),
    });
    assert.equal(memberInvite.response.ok, false, 'member invitation restriction failed');
    const outsiderCreate = await rpc('loopedin_create_group', outsider.token, {
      target_name: 'Unauthorized QA family', target_description: '', target_kind: 'family', target_creation_key: crypto.randomUUID(),
    });
    assert.equal(outsiderCreate.response.ok, false, 'outsider family creation restriction failed');

    const events = [
      await createEvent(owner, group.id, 'Hosted QA upcoming trip one', 3),
      await createEvent(memberA, group.id, 'Hosted QA upcoming trip two', 8),
      await createEvent(memberB, group.id, 'Hosted QA completed trip', -3),
    ];
    for (const [actor, status] of [[owner, 'going'], [memberA, 'maybe'], [memberB, 'going']]) {
      await required(table('loopedin_rsvps', actor.token, '?on_conflict=event_id,user_id&select=*', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({ event_id: events[0].id, user_id: actor.id, person_name: actor.displayName, status }),
      }), 'write QA RSVP');
    }

    realtime = await realtimeInsert(memberA.token, events[0].id);
    await realtime.ready;
    await required(rpc('loopedin_send_event_message', owner.token, {
      target_event_id: events[0].id, target_body: 'Hosted QA owner comment', target_operation_key: crypto.randomUUID(),
    }), 'send owner QA comment');
    await realtime.change;
    realtime.close();
    realtime = null;
    await required(rpc('loopedin_send_event_message', memberB.token, {
      target_event_id: events[2].id, target_body: 'Hosted QA completed trip memory', target_operation_key: crypto.randomUUID(),
    }), 'send completed-trip QA comment');

    await required(table('loopedin_reminder_drafts', memberA.token, '?on_conflict=event_id,user_id&select=*', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({ event_id: events[0].id, user_id: memberA.id, body: 'Morning of event', enabled: true }),
    }), 'write QA reminder');

    const storagePath = `${events[2].id}/${memberB.id}/${crypto.randomUUID()}.png`;
    paths.add(storagePath);
    const pending = await required(rpc('loopedin_begin_media_upload', memberB.token, {
      target_event_id: events[2].id, target_storage_path: storagePath,
      target_caption: 'Hosted QA private photo', target_alt_text: 'One pixel private QA image',
      target_source_name: null, target_source_url: null, target_creator_name: null, target_creator_url: null,
    }), 'begin QA media upload');
    await required(request(`/storage/v1/object/${BUCKET}/${storagePath}`, {
      token: memberB.token, method: 'POST', headers: { 'Content-Type': 'image/png', 'x-upsert': 'false' }, body: PNG,
    }), 'upload private QA photo');
    await required(rpc('loopedin_activate_media', memberB.token, { target_media_id: pending.id }), 'activate private QA photo');
    const ownerPhoto = await required(request(`/storage/v1/object/authenticated/${BUCKET}/${storagePath}`, { token: owner.token }), 'view private QA photo');
    assert.ok(ownerPhoto instanceof Uint8Array || ownerPhoto instanceof ArrayBuffer || typeof ownerPhoto === 'string', 'private photo response missing');
    assert.equal((await request(`/storage/v1/object/authenticated/${BUCKET}/${storagePath}`, { token: outsider.token })).response.ok, false, 'outsider read private photo');
    assert.equal((await table('loopedin_groups', outsider.token, `?id=eq.${group.id}&select=id`)).body.length, 0, 'outsider read QA family');
    assert.equal((await table('loopedin_events', outsider.token, `?group_id=eq.${group.id}&select=id`)).body.length, 0, 'outsider read QA events');
    const outsiderRsvp = await table('loopedin_rsvps', outsider.token, '', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: events[0].id, user_id: outsider.id, person_name: 'Outsider', status: 'going' }),
    });
    assert.equal(outsiderRsvp.response.ok, false, 'outsider wrote QA RSVP');

    const notifications = await required(table('loopedin_notifications', memberA.token, `?group_id=eq.${group.id}&select=id,kind`), 'read QA notifications');
    assert.ok(notifications.length > 0, 'QA notifications missing');
    const eventRows = await required(table('loopedin_events', owner.token, `?group_id=eq.${group.id}&select=id,starts_at`), 'read QA events');
    const rsvpRows = await required(table('loopedin_rsvps', owner.token, `?event_id=eq.${events[0].id}&select=user_id,status`), 'read shared QA RSVPs');
    const commentRows = await required(table('loopedin_event_messages', owner.token, `?event_id=in.(${events.map((event) => event.id).join(',')})&select=id`), 'read QA comments');
    const mediaRows = await required(table('loopedin_event_media', owner.token, `?event_id=eq.${events[2].id}&select=id`), 'read QA media');
    assert.equal(eventRows.length, 3);
    assert.equal(rsvpRows.length, 3);
    assert.equal(commentRows.length, 2);
    assert.equal(mediaRows.length, 1);

    await required(rpc('loopedin_claim_media_deletion', memberB.token, { target_media_id: pending.id }), 'claim QA photo deletion');
    await required(request(`/storage/v1/object/${BUCKET}`, {
      token: memberB.token, method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: [storagePath] }),
    }), 'delete private QA photo');
    await required(rpc('loopedin_finalize_media_deletion', memberB.token, { target_media_id: pending.id }), 'finalize QA photo deletion');
    summary = {
      runId, familyId: group.id, memberCount: 3, eventCount: eventRows.length,
      rsvpCount: rsvpRows.length, commentCount: commentRows.length, notificationCount: notifications.length,
      privateMediaCreated: 1, privateMediaDeleted: 1, realtimeObserved: true,
    };
  } catch (error) {
    primaryError = error;
  } finally {
    realtime?.close();
    try {
      const residue = await cleanup(runId, users, group?.id, paths);
      const protectedAfter = await protectedFingerprint(qaUserIds);
      if (protectedBefore && protectedAfter !== protectedBefore) throw new Error('protected non-QA state changed');
      if (summary) console.log(JSON.stringify({ ...summary, protectedStateUnchanged: true, residue }));
    } catch (cleanupError) {
      primaryError = new Error(primaryError ? `${redact(primaryError)}; cleanup failed` : `cleanup failed: ${redact(cleanupError)}`);
    }
  }
  if (primaryError) throw primaryError;
}

try {
  if (phase === 'prepare') await prepare();
  else await run();
} catch (error) {
  console.error(`hosted staging family QA failed: ${redact(error)}`);
  process.exitCode = 1;
}
