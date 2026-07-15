import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const mode = process.argv[2];
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const runMarker = process.env.BROWSER_E2E_RUN_MARKER ?? 'family-browser-v1';
const includeOutsider = process.env.BROWSER_E2E_INCLUDE_OUTSIDER === 'true';
const dbContainer = process.env.SUPABASE_DB_CONTAINER ?? 'supabase_db_family-loop';
const password = 'Local-browser-proof-42!';
const bucket = 'loopedin-event-media';

assert.ok(['provision', 'verify', 'cleanup'].includes(mode), 'usage: node tests/provision-local-supabase-browser.mjs <provision|verify|cleanup>');
assert.ok(url && serviceKey, 'local Supabase URL and service role key are required');
assert.ok(['127.0.0.1', 'localhost', '::1'].includes(new URL(url).hostname), 'browser proof provisioning only runs against loopback Supabase');
assert.match(runMarker, /^[a-z0-9][a-z0-9-]{2,39}$/, 'run marker must be 3-40 lowercase letters, numbers, or hyphens');

const suffix = `-${runMarker}@loopedin.test`;
const accounts = [
  { email: `browser-owner${suffix}`, displayName: 'Avery Browser', role: 'initial-owner' },
  ...(includeOutsider ? [{ email: `browser-outsider${suffix}`, displayName: 'Outside Browser', role: 'outsider' }] : []),
];

async function request(path, options = {}) {
  const response = await fetch(`${url}${path}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const text = await response.text();
  let body = text;
  try { body = text ? JSON.parse(text) : null; } catch {}
  return { response, body };
}

async function expectOk(path, options, label) {
  const result = await request(path, options);
  assert.ok(result.response.ok, `${label} failed (${result.response.status})`);
  return result.body;
}

function sql(statement) {
  const result = spawnSync('docker', ['exec', '-i', dbContainer, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'], {
    input: statement,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, `local database command failed: ${result.stderr.trim()}`);
  return result.stdout.trim();
}

function quote(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

async function listMarkedUsers() {
  const body = await expectOk('/auth/v1/admin/users?page=1&per_page=1000', {}, 'list local users');
  return body.users.filter((user) => user.email?.endsWith(suffix));
}

async function ensureAccount(account) {
  const users = await listMarkedUsers();
  const existing = users.find((user) => user.email === account.email);
  const userMetadata = { display_name: account.displayName, browser_run_marker: runMarker, browser_role: account.role };
  if (existing) {
    await expectOk(`/auth/v1/admin/users/${existing.id}`, {
      method: 'PUT', body: JSON.stringify({ password, email_confirm: true, user_metadata: userMetadata }),
    }, `refresh ${account.role} account`);
    return existing.id;
  }
  const created = await expectOk('/auth/v1/admin/users', {
    method: 'POST', body: JSON.stringify({ email: account.email, password, email_confirm: true, user_metadata: userMetadata }),
  }, `create ${account.role} account`);
  return created.id;
}

function inspect(ids) {
  const idList = ids.length ? ids.map(quote).join(',') : "'00000000-0000-0000-0000-000000000000'";
  const result = sql(`
    select json_build_object(
      'profiles', (select count(*) from public.loopedin_profiles where id in (${idList})),
      'entitlements', (select count(*) from loopedin_private.loopedin_group_creation_entitlements where user_id in (${idList})),
      'readyEntitlements', (select count(*) from loopedin_private.loopedin_group_creation_entitlements where user_id in (${idList}) and consumed_at is null and group_id is null),
      'groups', (select count(*) from public.loopedin_groups where created_by in (${idList})),
      'memberships', (select count(*) from public.loopedin_group_members where user_id in (${idList}))
    );
  `);
  return JSON.parse(result);
}

async function provision() {
  const ids = [];
  for (const account of accounts) ids.push(await ensureAccount(account));
  const ownerId = ids[0];
  sql(`insert into loopedin_private.loopedin_group_creation_entitlements(user_id) values (${quote(ownerId)}) on conflict (user_id) do nothing;`);
  const state = inspect(ids);
  assert.equal(state.profiles, accounts.length, 'every synthetic account must have exactly one profile');
  assert.equal(state.entitlements, 1, 'only the initial owner may have a creation entitlement');
  assert.equal(state.readyEntitlements, 1, 'the initial owner entitlement must be unconsumed');
  assert.equal(state.groups, 0, 'this run marker already owns a family; clean it before reprovisioning');
  assert.equal(state.memberships, 0, 'this run marker already has memberships; clean it before reprovisioning');
  console.log(`Browser proof ready: run=${runMarker}; accounts=${accounts.length}; state=signed-out, no-family, owner-entitled; url=http://127.0.0.1:8081`);
}

async function verify() {
  const users = await listMarkedUsers();
  assert.equal(users.length, accounts.length, 'marked Auth account count differs from the requested handoff');
  const ids = users.map((user) => user.id);
  const state = inspect(ids);
  assert.deepEqual(state, { profiles: accounts.length, entitlements: 1, readyEntitlements: 1, groups: 0, memberships: 0 });
  console.log(`Browser proof verified: run=${runMarker}; state=signed-out, no-family, owner-entitled`);
}

async function cleanup() {
  const users = await listMarkedUsers();
  const ids = users.map((user) => user.id);
  const idList = ids.length ? ids.map(quote).join(',') : "'00000000-0000-0000-0000-000000000000'";
  const groupIds = JSON.parse(sql(`select coalesce(json_agg(id), '[]'::json)::text from public.loopedin_groups where created_by in (${idList});`) || '[]');
  const groupList = groupIds.length ? groupIds.map(quote).join(',') : "'00000000-0000-0000-0000-000000000000'";
  const paths = JSON.parse(sql(`
    select coalesce(json_agg(path), '[]'::json)::text from (
      select media.storage_path as path
      from public.loopedin_event_media media
      join public.loopedin_events event on event.id = media.event_id
      where media.uploaded_by in (${idList}) or event.group_id in (${groupList})
      union
      select object.name
      from storage.objects object
      where object.bucket_id = ${quote(bucket)}
        and (
          object.owner_id in (${idList})
          or split_part(object.name, '/', 1) in (
            select event.id::text from public.loopedin_events event where event.group_id in (${groupList})
          )
        )
    ) marked_paths;
  `) || '[]');

  if (paths.length) {
    await expectOk(`/storage/v1/object/${bucket}`, { method: 'DELETE', body: JSON.stringify({ prefixes: paths }) }, 'remove marked storage objects');
  }
  sql(`
    delete from public.loopedin_event_media media
    using public.loopedin_events event
    where media.event_id = event.id and (media.uploaded_by in (${idList}) or event.group_id in (${groupList}));
    delete from public.loopedin_group_invitations
    where invited_by in (${idList}) or responded_by in (${idList}) or invitee_email like ${quote(`%${suffix}`)};
    delete from public.loopedin_groups where id in (${groupList});
  `);
  for (const user of users) await expectOk(`/auth/v1/admin/users/${user.id}`, { method: 'DELETE' }, 'remove marked local user');

  const pathList = paths.length ? paths.map(quote).join(',') : "'__none__'";
  const residue = JSON.parse(sql(`
    select json_build_object(
      'users', (select count(*) from auth.users where email like ${quote(`%${suffix}`)}),
      'profiles', (select count(*) from public.loopedin_profiles where id in (${idList})),
      'groups', (select count(*) from public.loopedin_groups where id in (${groupList})),
      'invitations', (select count(*) from public.loopedin_group_invitations where invitee_email like ${quote(`%${suffix}`)}),
      'mediaRows', (select count(*) from public.loopedin_event_media where storage_path in (${pathList})),
      'storageObjects', (select count(*) from storage.objects where bucket_id = ${quote(bucket)} and name in (${pathList}))
    );
  `));
  assert.deepEqual(residue, { users: 0, profiles: 0, groups: 0, invitations: 0, mediaRows: 0, storageObjects: 0 });
  console.log(`Browser proof cleanup verified: run=${runMarker}; residue=0`);
}

if (mode === 'provision') await provision();
else if (mode === 'verify') await verify();
else await cleanup();
