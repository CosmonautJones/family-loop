import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const url = process.env.SUPABASE_URL;
const runMarker = process.env.BROWSER_E2E_RUN_MARKER ?? 'family-browser-v1';
const dbContainer = process.env.SUPABASE_DB_CONTAINER ?? 'supabase_db_family-loop';

assert.ok(url, 'local Supabase URL is required');
assert.ok(['127.0.0.1', 'localhost', '::1'].includes(new URL(url).hostname), 'browser scenario verification only runs against loopback Supabase');
assert.match(runMarker, /^[a-z0-9][a-z0-9-]{2,39}$/, 'run marker must be 3-40 lowercase letters, numbers, or hyphens');

function quote(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

function readScenario() {
  const suffix = `-${runMarker}@loopedin.test`;
  const sql = `
    begin transaction read only;
    with marked_users as (
      select users.id, users.email, profiles.display_name
      from auth.users users
      left join public.loopedin_profiles profiles on profiles.id = users.id
      where users.email like ${quote(`%${suffix}`)}
    ), target_group as (
      select groups.*
      from public.loopedin_groups groups
      join marked_users owner on owner.id = groups.created_by
      where owner.email = ${quote(`browser-owner${suffix}`)}
    ), target_events as (
      select events.* from public.loopedin_events events
      join target_group groups on groups.id = events.group_id
    ), target_media as (
      select media.* from public.loopedin_event_media media
      join target_events events on events.id = media.event_id
    )
    select json_build_object(
      'identities', (select coalesce(json_agg(json_build_object('email', email, 'name', display_name) order by email), '[]'::json) from marked_users),
      'groups', (select coalesce(json_agg(json_build_object('id', id, 'name', name)), '[]'::json) from target_group),
      'members', (select coalesce(json_agg(json_build_object('email', users.email, 'role', members.role) order by users.email), '[]'::json) from public.loopedin_group_members members join auth.users users on users.id = members.user_id join target_group groups on groups.id = members.group_id),
      'events', (select coalesce(json_agg(json_build_object('title', events.title, 'creator', users.email) order by events.starts_at), '[]'::json) from target_events events join auth.users users on users.id = events.created_by),
      'messages', (select coalesce(json_agg(json_build_object('event', events.title, 'author', users.email) order by events.title, users.email), '[]'::json) from public.loopedin_event_messages messages join target_events events on events.id = messages.event_id join auth.users users on users.id = messages.author_id),
      'rsvps', (select coalesce(json_agg(json_build_object('event', events.title, 'user', users.email, 'status', rsvps.status) order by events.title, users.email), '[]'::json) from public.loopedin_rsvps rsvps join target_events events on events.id = rsvps.event_id join auth.users users on users.id = rsvps.user_id),
      'media', (select coalesce(json_agg(json_build_object('event', events.title, 'uploader', users.email, 'caption', media.caption, 'status', media.status, 'sourceUrl', media.source_url is not null) order by media.uploaded_at), '[]'::json) from target_media media join target_events events on events.id = media.event_id join auth.users users on users.id = media.uploaded_by),
      'notifications', (select json_build_object(
        'total', count(*),
        'read', count(*) filter (where notifications.read),
        'unread', count(*) filter (where not notifications.read),
        'recipients', count(distinct notifications.user_id),
        'invalidRecipient', count(*) filter (where members.user_id is null),
        'invalidEvent', count(*) filter (where notifications.event_id is not null and events.id is null),
        'nonGeneric', count(*) filter (where (notifications.kind, notifications.title, notifications.body) not in (
          ('event_update', 'New family plan', 'A family plan was added.'),
          ('event_update', 'Family plan updated', 'A family plan was updated.'),
          ('rsvp', 'RSVP updated', 'Someone responded to a family plan.'),
          ('message', 'New family comment', 'Someone commented on a family plan.'),
          ('media', 'New family photo', 'A photo was shared with the family.')
        ))
      ) from public.loopedin_notifications notifications join target_group groups on groups.id = notifications.group_id left join public.loopedin_group_members members on members.group_id = notifications.group_id and members.user_id = notifications.user_id left join target_events events on events.id = notifications.event_id),
      'notificationUsers', (select coalesce(json_agg(row_to_json(summary) order by summary.email), '[]'::json) from (
        select users.email, count(*)::integer total, count(*) filter (where notifications.read)::integer read, count(*) filter (where not notifications.read)::integer unread
        from public.loopedin_notifications notifications join marked_users users on users.id = notifications.user_id join target_group groups on groups.id = notifications.group_id
        group by users.email
      ) summary),
      'storage', (select json_build_object(
        'bucketPrivate', bool_and(not buckets.public),
        'objects', count(objects.name),
        'missingObjects', count(*) filter (where objects.name is null),
        'ownerMismatch', count(*) filter (where objects.owner_id is distinct from media.uploaded_by::text),
        'pathMismatch', count(*) filter (where media.storage_path not like media.event_id::text || '/' || media.uploaded_by::text || '/%')
      ) from target_media media cross join storage.buckets buckets left join storage.objects objects on objects.bucket_id = buckets.id and objects.name = media.storage_path where buckets.id = 'loopedin-event-media'),
      'extraStorageObjects', (select count(*) from storage.objects objects join target_events events on split_part(objects.name, '/', 1) = events.id::text left join target_media media on media.storage_path = objects.name where objects.bucket_id = 'loopedin-event-media' and media.id is null),
      'outsiderResidue', (select json_build_object(
        'memberships', (select count(*) from public.loopedin_group_members where user_id = outsider.id),
        'events', (select count(*) from public.loopedin_events where created_by = outsider.id),
        'messages', (select count(*) from public.loopedin_event_messages where author_id = outsider.id),
        'rsvps', (select count(*) from public.loopedin_rsvps where user_id = outsider.id),
        'media', (select count(*) from public.loopedin_event_media where uploaded_by = outsider.id),
        'notifications', (select count(*) from public.loopedin_notifications where user_id = outsider.id),
        'storageObjects', (select count(*) from storage.objects where owner_id = outsider.id::text)
      ) from marked_users outsider where outsider.email = ${quote(`browser-outsider${suffix}`)})
    );
    commit;
  `;
  const result = spawnSync('docker', ['exec', '-i', dbContainer, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-Atq'], {
    input: sql,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, `read-only local database verification failed: ${result.stderr.trim()}`);
  return JSON.parse(result.stdout.trim());
}

const suffix = `-${runMarker}@loopedin.test`;
const emails = {
  jordan: `browser-jordan${suffix}`,
  maya: `browser-maya${suffix}`,
  outsider: `browser-outsider${suffix}`,
  owner: `browser-owner${suffix}`,
};
const scenario = readScenario();

assert.deepEqual(scenario.identities, [
  { email: emails.jordan, name: 'Jordan Jones' },
  { email: emails.maya, name: 'Maya Jones' },
  { email: emails.outsider, name: 'Outside Browser' },
  { email: emails.owner, name: 'Avery Browser' },
]);
assert.equal(scenario.groups.length, 1);
assert.equal(scenario.groups[0].name, 'Jones Family');
assert.deepEqual(scenario.members, [
  { email: emails.jordan, role: 'member' },
  { email: emails.maya, role: 'member' },
  { email: emails.owner, role: 'owner' },
]);
assert.deepEqual(scenario.events, [
  { title: 'Lake Geneva Family Reunion', creator: emails.jordan },
  { title: 'Door County Cabin Weekend', creator: emails.owner },
  { title: 'Yellowstone Road Trip', creator: emails.maya },
]);
assert.deepEqual(scenario.messages, [
  { event: 'Door County Cabin Weekend', author: emails.jordan },
  { event: 'Door County Cabin Weekend', author: emails.maya },
  { event: 'Door County Cabin Weekend', author: emails.owner },
  { event: 'Lake Geneva Family Reunion', author: emails.jordan },
  { event: 'Lake Geneva Family Reunion', author: emails.maya },
  { event: 'Yellowstone Road Trip', author: emails.maya },
]);
assert.deepEqual(scenario.rsvps, [
  { event: 'Door County Cabin Weekend', user: emails.jordan, status: 'maybe' },
  { event: 'Door County Cabin Weekend', user: emails.maya, status: 'going' },
  { event: 'Door County Cabin Weekend', user: emails.owner, status: 'going' },
  { event: 'Lake Geneva Family Reunion', user: emails.jordan, status: 'going' },
  { event: 'Lake Geneva Family Reunion', user: emails.maya, status: 'maybe' },
  { event: 'Yellowstone Road Trip', user: emails.maya, status: 'going' },
]);
assert.deepEqual(scenario.media, [
  { event: 'Lake Geneva Family Reunion', uploader: emails.jordan, caption: 'Everyone together by the lake', status: 'active', sourceUrl: true },
  { event: 'Lake Geneva Family Reunion', uploader: emails.maya, caption: 'Sunday breakfast before the drive home', status: 'active', sourceUrl: true },
  { event: 'Lake Geneva Family Reunion', uploader: emails.owner, caption: 'Sunset from the porch', status: 'active', sourceUrl: false },
]);
assert.deepEqual(scenario.notifications, { total: 38, read: 14, unread: 24, recipients: 3, invalidRecipient: 0, invalidEvent: 0, nonGeneric: 0 });
assert.deepEqual(scenario.notificationUsers, [
  { email: emails.jordan, total: 13, read: 0, unread: 13 },
  { email: emails.maya, total: 11, read: 0, unread: 11 },
  { email: emails.owner, total: 14, read: 14, unread: 0 },
]);
assert.deepEqual(scenario.storage, { bucketPrivate: true, objects: 3, missingObjects: 0, ownerMismatch: 0, pathMismatch: 0 });
assert.equal(scenario.extraStorageObjects, 0);
assert.deepEqual(scenario.outsiderResidue, { memberships: 0, events: 0, messages: 0, rsvps: 0, media: 0, notifications: 0, storageObjects: 0 });

console.log(`Browser scenario verified read-only: run=${runMarker}; identities=4; members=3; trips=3; messages=6; rsvps=6; media=3; notifications=38; storageObjects=3; outsiderResidue=0`);
