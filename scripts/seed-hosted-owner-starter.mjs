import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const EXPECTED_PROJECT_REF = 'vkogznsfthirhxkqysza';
const QUARANTINED_PROJECT_REF = 'lzscofbvecgpchokxhyb';
const BUCKET = 'loopedin-event-media';
const ACK = 'I_ACKNOWLEDGE_LOOPEDIN_REAL_OWNER_STARTER_DATA';

const projectRef = process.env.LOOPEDIN_HOSTED_PROJECT_REF;
const url = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const ownerEmail = process.env.LOOPEDIN_OWNER_EMAIL?.trim().toLowerCase();
const ownerName = process.env.LOOPEDIN_OWNER_NAME?.trim();
const familyName = process.env.LOOPEDIN_FAMILY_NAME?.trim();
const sensitiveValues = new Set([publishableKey, secretKey, ownerEmail].filter(Boolean));

assert.equal(process.env.LOOPEDIN_REAL_OWNER_ACK, ACK, 'real-owner starter-data acknowledgement required');
assert.equal(projectRef, EXPECTED_PROJECT_REF, 'unexpected hosted project');
assert.notEqual(projectRef, QUARANTINED_PROJECT_REF, 'quarantined project refused');
assert.equal(url, `https://${EXPECTED_PROJECT_REF}.supabase.co`, 'unexpected hosted URL');
assert.ok(publishableKey?.startsWith('sb_publishable_'), 'publishable key required');
assert.ok(secretKey?.startsWith('sb_secret_'), 'secret key required');
assert.match(ownerEmail ?? '', /^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'owner email required');
assert.ok(ownerName, 'owner name required');
assert.ok(familyName, 'family name required');

const EVENTS = [
  {
    key: 'door-county', operationKey: '8cbf46b1-cfbb-45ea-a02b-a113a259d31d',
    title: 'Door County Weekend', startsAt: '2026-08-07T14:00:00-05:00', endsAt: '2026-08-09T18:00:00-05:00',
    location: 'Fish Creek, Wisconsin', description: 'Cabin weekend with an easy fish boil dinner, a shoreline walk, and plenty of downtime.',
    statusLabel: 'Planning', comment: 'I started the weekend plan here so we can keep travel notes, meals, and photos together.',
    commentKey: 'da46bb27-84be-48f7-af7f-966847ed1ced', reminder: 'Check the shared plan the evening before we leave.',
    timeline: [{ title: 'Friday', detail: 'Arrive, settle into the cabin, and have an easy dinner.' }, { title: 'Saturday', detail: 'Fish Creek, shoreline time, and a family meal.' }],
  },
  {
    key: 'yellowstone', operationKey: '92a152fc-0a47-4369-b8e1-0bbfc4023719',
    title: 'Yellowstone Family Road Trip', startsAt: '2026-09-05T08:00:00-05:00', endsAt: '2026-09-12T20:00:00-06:00',
    location: 'Yellowstone National Park', description: 'A relaxed week of geysers, wildlife stops, accessible boardwalks, and unhurried family time.',
    statusLabel: 'Planning', comment: 'Let’s use this thread for driving stops and the short walks everyone most wants to do.',
    commentKey: '32f677ca-69fb-4117-a13e-58c997c169ee', reminder: null,
    timeline: [{ title: 'Travel day', detail: 'Leave room for breaks and one scenic stop.' }, { title: 'Park days', detail: 'Choose one main outing each day and keep the rest flexible.' }],
  },
  {
    key: 'charleston', operationKey: '657d463e-4e7d-4478-9f1b-f9d283840a47',
    title: 'Charleston Holiday Visit', startsAt: '2026-12-20T07:30:00-06:00', endsAt: '2026-12-27T19:00:00-05:00',
    location: 'Charleston, South Carolina', description: 'Christmas together with one shared itinerary, a family dinner, and plenty of open time.',
    statusLabel: 'Planning', comment: 'I added the dates early so everyone has one place to check the holiday plan.',
    commentKey: '5ee46e4a-6eb1-4981-9f7d-fea4013b3ada', reminder: null,
    timeline: [{ title: 'Arrival', detail: 'Share arrival windows here as plans settle.' }, { title: 'Christmas dinner', detail: 'Keep the menu and timing in this event thread.' }],
  },
  {
    key: 'lake-geneva', operationKey: 'd7191e39-178f-4bcc-9ce0-a4f7bad14e6c',
    title: 'Lake Geneva Reunion', startsAt: '2026-06-12T10:00:00-05:00', endsAt: '2026-06-14T17:00:00-05:00',
    location: 'Lake Geneva, Wisconsin', description: 'Our completed summer reunion, saved with the conversation and favorite lake photos.',
    statusLabel: 'Memory', comment: 'Such a good weekend. I saved a few lake photos here so the memory is easy to find later.',
    commentKey: '03848e6e-6b12-4be3-8bd3-030a30148fd2', reminder: null,
    timeline: [{ title: 'Friday', detail: 'Arrived and caught up by the lake.' }, { title: 'Weekend', detail: 'A relaxed reunion with walks, meals, and time together.' }],
  },
];

const PHOTOS = [
  {
    eventKey: 'door-county', fileId: '0cfffa94-55fa-47e5-a5b0-b0b7349986c4',
    downloadUrl: 'https://images.unsplash.com/photo-1729857016770-19575429a71c?auto=format&fit=crop&fm=jpg&q=82&w=1600',
    caption: 'A quiet cabin by the lake', altText: 'A small cabin beside a calm lake and green forest.',
    sourceUrl: 'https://unsplash.com/photos/a-small-cabin-on-the-shore-of-a-lake-k1s0vXscfAg', creatorName: 'Polina', creatorUrl: 'https://unsplash.com/@confettiparade',
  },
  {
    eventKey: 'yellowstone', fileId: 'e50462d5-8c95-456b-a04c-a2689bfb919b',
    downloadUrl: 'https://images.unsplash.com/photo-1747372279441-39aa5c9533f7?auto=format&fit=crop&fm=jpg&q=82&w=1600',
    caption: 'Mountains reflected at sunset', altText: 'Purple evening light over mountains reflected in a still lake.',
    sourceUrl: 'https://unsplash.com/photos/mountains-and-a-lake-at-sunset-bYwZUtq2Uhs', creatorName: 'Royce Fonseca', creatorUrl: 'https://unsplash.com/@casunshine0508',
  },
  {
    eventKey: 'lake-geneva', fileId: 'bb64ce56-e0a8-4641-a041-774855f611d8',
    downloadUrl: 'https://images.unsplash.com/photo-1760127996311-dd5247002675?auto=format&fit=crop&fm=jpg&q=82&w=1600',
    caption: 'Family time beside the lake', altText: 'A family looking across a calm lake toward distant mountains.',
    sourceUrl: 'https://unsplash.com/photos/family-looking-at-a-calm-lake-with-mountains-dm1ouf9w6VQ', creatorName: 'Gruescu Ovidiu', creatorUrl: 'https://unsplash.com/@ovidiugruescu',
  },
];

function redact(value) {
  let text = value instanceof Error ? value.message : String(value);
  for (const secret of sensitiveValues) if (secret) text = text.replaceAll(secret, '[REDACTED]');
  return text
    .replace(/https?:\/\/[^\s]+/gi, '[REDACTED_URL]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED_TOKEN]')
    .replace(/\b[0-9a-f]{64}\b/gi, '[REDACTED_TOKEN]')
    .replace(/sb_(?:publishable|secret)_[A-Za-z0-9_-]+/g, '[REDACTED_KEY]');
}

async function request(path, { token = publishableKey, headers = {}, binary = false, ...options } = {}) {
  const apiKey = token === secretKey ? secretKey : publishableKey;
  const response = await fetch(`${url}${path}`, { ...options, headers: { apikey: apiKey, Authorization: `Bearer ${token}`, ...headers } });
  if (binary) return { response, body: Buffer.from(await response.arrayBuffer()) };
  const text = await response.text();
  let body = text;
  try { body = text ? JSON.parse(text) : null; } catch {}
  return { response, body };
}

async function required(promise, label) {
  const result = await promise;
  if (!result.response.ok) throw new Error(`${label} failed (HTTP ${result.response.status})`);
  return result.body;
}

function rpc(name, token, body) {
  return request(`/rest/v1/rpc/${name}`, { token, method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

function table(name, token, suffix = '', options = {}) {
  return request(`/rest/v1/${name}${suffix}`, { token, ...options });
}

function exactEvent(row, definition, ownerId, groupId) {
  return row.group_id === groupId && row.created_by === ownerId && row.title === definition.title
    && new Date(row.starts_at).getTime() === new Date(definition.startsAt).getTime()
    && new Date(row.ends_at).getTime() === new Date(definition.endsAt).getTime()
    && row.location === definition.location && row.description === definition.description
    && row.status_label === definition.statusLabel && row.visibility === 'group'
    && JSON.stringify(row.timeline) === JSON.stringify(definition.timeline) && row.cover_url === null;
}

async function ownerSession(ownerId) {
  const generated = await required(request('/auth/v1/admin/generate_link', {
    token: secretKey, method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'magiclink', email: ownerEmail, options: { redirect_to: 'https://loopedin-family.netlify.app' } }),
  }), 'generate ephemeral owner sign-in');
  const tokenHash = generated?.properties?.hashed_token ?? generated?.hashed_token;
  assert.match(tokenHash ?? '', /^[A-Za-z0-9_-]{32,256}$/, 'ephemeral owner token unavailable');
  sensitiveValues.add(tokenHash);
  if (generated?.properties?.action_link) sensitiveValues.add(generated.properties.action_link);
  const verified = await required(request('/auth/v1/verify', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'magiclink', token_hash: tokenHash }),
  }), 'verify ephemeral owner sign-in');
  assert.equal(verified?.user?.id, ownerId, 'ephemeral session identity mismatch');
  assert.ok(verified?.access_token, 'ephemeral owner session unavailable');
  sensitiveValues.add(verified.access_token);
  if (verified.refresh_token) sensitiveValues.add(verified.refresh_token);
  return verified.access_token;
}

async function ensureEvent(token, ownerId, groupId, definition) {
  const existing = await required(table('loopedin_events', token, `?group_id=eq.${groupId}&title=eq.${encodeURIComponent(definition.title)}&select=*`), `read ${definition.key}`);
  assert.ok(existing.length <= 1, `duplicate ${definition.key} events`);
  if (existing.length === 1) {
    assert.ok(exactEvent(existing[0], definition, ownerId, groupId), `${definition.key} event collision`);
    return existing[0];
  }
  const created = await required(rpc('loopedin_create_event', token, {
    target_group_id: groupId, target_title: definition.title, target_starts_at: definition.startsAt,
    target_ends_at: definition.endsAt, target_location: definition.location, target_description: definition.description,
    target_status_label: definition.statusLabel, target_visibility: 'group', target_timeline: definition.timeline,
    target_cover_url: null, target_operation_key: definition.operationKey,
  }), `create ${definition.key}`);
  assert.ok(exactEvent(created, definition, ownerId, groupId), `${definition.key} create mismatch`);
  return created;
}

async function ensureRsvpAndComment(token, ownerId, event, definition) {
  const rsvps = await required(table('loopedin_rsvps', token, `?event_id=eq.${event.id}&user_id=eq.${ownerId}&select=*`), `read ${definition.key} RSVP`);
  assert.ok(rsvps.length <= 1, `duplicate ${definition.key} RSVP`);
  if (rsvps.length === 0) {
    await required(table('loopedin_rsvps', token, '?on_conflict=event_id,user_id&select=*', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({ event_id: event.id, user_id: ownerId, person_name: ownerName, status: 'going' }),
    }), `create ${definition.key} RSVP`);
  } else {
    assert.equal(rsvps[0].person_name, ownerName, `${definition.key} RSVP name collision`);
    assert.equal(rsvps[0].status, 'going', `${definition.key} RSVP status collision`);
  }
  const message = await required(rpc('loopedin_send_event_message', token, {
    target_event_id: event.id, target_body: definition.comment, target_operation_key: definition.commentKey,
  }), `write ${definition.key} comment`);
  assert.ok(message.author_id === ownerId, `${definition.key} comment author mismatch`);
  assert.equal(message.body, definition.comment, `${definition.key} comment mismatch`);
  if (definition.reminder) {
    const reminders = await required(table('loopedin_reminder_drafts', token, `?event_id=eq.${event.id}&user_id=eq.${ownerId}&select=*`), 'read starter reminder');
    assert.ok(reminders.length <= 1, 'duplicate starter reminder');
    if (reminders.length === 0) {
      await required(table('loopedin_reminder_drafts', token, '?on_conflict=event_id,user_id&select=*', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({ event_id: event.id, user_id: ownerId, body: definition.reminder, enabled: true }),
      }), 'create starter reminder');
    } else {
      assert.equal(reminders[0].body, definition.reminder, 'starter reminder collision');
      assert.equal(reminders[0].enabled, true, 'starter reminder disabled');
    }
  }
}

async function downloadPhoto(photo) {
  const source = new URL(photo.downloadUrl);
  assert.equal(source.protocol, 'https:');
  assert.equal(source.hostname, 'images.unsplash.com');
  const response = await fetch(source, { headers: { 'User-Agent': 'LoopedIn hosted starter-data seeder' } });
  assert.equal(response.ok, true, `download ${photo.eventKey} photo failed`);
  assert.match(response.headers.get('content-type') ?? '', /^image\/jpeg/i, `download ${photo.eventKey} photo type mismatch`);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.ok(bytes.length > 10_000 && bytes.length <= 10_000_000, `download ${photo.eventKey} photo size invalid`);
  return bytes;
}

async function ensurePhoto(token, ownerId, event, photo) {
  const path = `${event.id}/${ownerId}/${photo.fileId}.jpg`;
  const existing = await required(table('loopedin_event_media', token, `?event_id=eq.${event.id}&storage_path=eq.${encodeURIComponent(path)}&select=*`), `read ${photo.eventKey} photo`);
  assert.ok(existing.length <= 1, `duplicate ${photo.eventKey} photo`);
  if (existing.length === 1) {
    const row = existing[0];
    assert.equal(row.uploaded_by, ownerId, `${photo.eventKey} photo owner collision`);
    assert.equal(row.caption, photo.caption, `${photo.eventKey} photo caption collision`);
    assert.equal(row.alt_text, photo.altText, `${photo.eventKey} photo description collision`);
    assert.equal(row.source_name, 'Unsplash', `${photo.eventKey} photo source name collision`);
    assert.equal(row.source_url, photo.sourceUrl, `${photo.eventKey} photo source collision`);
    assert.equal(row.creator_name, photo.creatorName, `${photo.eventKey} photo creator collision`);
    assert.equal(row.creator_url, photo.creatorUrl, `${photo.eventKey} photo creator link collision`);
    if (row.status === 'active') {
      const bytes = await required(request(`/storage/v1/object/authenticated/${BUCKET}/${path}`, { token, binary: true }), `read ${photo.eventKey} private photo`);
      return crypto.createHash('sha256').update(bytes).digest('hex');
    }
    assert.equal(row.status, 'pending', `${photo.eventKey} photo is not recoverable`);
    const object = await request(`/storage/v1/object/authenticated/${BUCKET}/${path}`, { token: secretKey, binary: true });
    if (object.response.ok) {
      await required(rpc('loopedin_activate_media', token, { target_media_id: row.id }), `recover ${photo.eventKey} private photo`);
      return crypto.createHash('sha256').update(object.body).digest('hex');
    }
    assert.equal(object.response.status, 404, `${photo.eventKey} photo object state is ambiguous`);
    await required(rpc('loopedin_abort_media_upload', token, { target_media_id: row.id }), `clear ${photo.eventKey} pending photo`);
    return ensurePhoto(token, ownerId, event, photo);
  }
  const bytes = await downloadPhoto(photo);
  const pending = await required(rpc('loopedin_begin_media_upload', token, {
    target_event_id: event.id, target_storage_path: path, target_caption: photo.caption, target_alt_text: photo.altText,
    target_source_name: 'Unsplash', target_source_url: photo.sourceUrl,
    target_creator_name: photo.creatorName, target_creator_url: photo.creatorUrl,
  }), `begin ${photo.eventKey} photo upload`);
  try {
    await required(request(`/storage/v1/object/${BUCKET}/${path}`, {
      token, method: 'POST', headers: { 'Content-Type': 'image/jpeg', 'x-upsert': 'false' }, body: bytes,
    }), `upload ${photo.eventKey} private photo`);
    await required(rpc('loopedin_activate_media', token, { target_media_id: pending.id }), `activate ${photo.eventKey} private photo`);
  } catch (error) {
    const rows = await table('loopedin_event_media', secretKey, `?id=eq.${pending.id}&select=id,status`).catch(() => null);
    const object = await request(`/storage/v1/object/authenticated/${BUCKET}/${path}`, { token: secretKey, binary: true }).catch(() => null);
    const row = rows?.response.ok && rows.body.length === 1 ? rows.body[0] : null;
    if (row?.status === 'active' && object?.response.ok) {
      return crypto.createHash('sha256').update(object.body).digest('hex');
    }
    if (row?.status === 'pending' && object?.response.ok) {
      const recovered = await rpc('loopedin_activate_media', token, { target_media_id: pending.id }).catch(() => null);
      if (recovered?.response.ok) return crypto.createHash('sha256').update(object.body).digest('hex');
      throw new Error(`${photo.eventKey} upload remains safely pending for retry`);
    }
    if (row?.status === 'pending' && object?.response.status === 404) {
      const aborted = await rpc('loopedin_abort_media_upload', token, { target_media_id: pending.id }).catch(() => null);
      if (aborted?.response.ok && aborted.body === true) throw error;
    }
    throw new Error(`${photo.eventKey} upload state requires operator review`);
  }
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

async function removeExactValidationEvent(token, ownerId, groupId) {
  const rows = await required(table('loopedin_events', token, '?id=eq.1c96be35-fddc-419e-9e3c-aa1fde50d458&select=*'), 'read validation event');
  if (rows.length === 0) return false;
  assert.equal(rows.length, 1, 'duplicate validation event identity');
  const row = rows[0];
  assert.ok(row.group_id === groupId && row.created_by === ownerId && row.title === 'Testing'
    && row.starts_at === '2026-07-22T15:00:00+00:00' && row.ends_at === '2026-07-22T17:00:00+00:00'
    && row.location === 'PLACE PLANET' && row.description === 'BRING BEER' && row.status_label === 'Open'
    && row.visibility === 'group' && row.cover_url === null
    && JSON.stringify(row.timeline) === JSON.stringify([
      { title: 'Logistics', detail: 'PLACE PLANET details are ready to share.' },
      { title: 'Conversation', detail: 'Chat, reminders, and media attach to this event.' },
    ]), 'validation event marker mismatch');
  const rsvps = await required(table('loopedin_rsvps', token, `?event_id=eq.${row.id}&select=user_id,person_name,status,note`), 'check validation RSVPs');
  const messages = await required(table('loopedin_event_messages', token, `?event_id=eq.${row.id}&select=id`), 'check validation comments');
  const media = await required(table('loopedin_event_media', token, `?event_id=eq.${row.id}&select=id`), 'check validation media');
  const reminders = await required(table('loopedin_reminder_drafts', token, `?event_id=eq.${row.id}&select=event_id`), 'check validation reminders');
  const notifications = await required(table('loopedin_notifications', token, `?event_id=eq.${row.id}&select=id`), 'check validation notifications');
  assert.deepEqual(rsvps, [{ user_id: ownerId, person_name: ownerName, status: 'going', note: null }], 'validation event RSVP marker mismatch');
  assert.equal(messages.length, 0, 'validation event has comments and was preserved');
  assert.equal(media.length, 0, 'validation event has media and was preserved');
  assert.equal(reminders.length, 0, 'validation event has reminders and was preserved');
  assert.equal(notifications.length, 0, 'validation event has notifications and was preserved');
  await required(table('loopedin_events', token, `?id=eq.${row.id}`, { method: 'DELETE' }), 'remove exact validation event');
  const residue = await required(table('loopedin_events', token, `?id=eq.${row.id}&select=id`), 'verify validation event removal');
  assert.equal(residue.length, 0, 'validation event remained');
  return true;
}

async function main() {
  const users = await required(request('/auth/v1/admin/users?page=1&per_page=1000', { token: secretKey }), 'list owner identity');
  const listed = Array.isArray(users) ? users : users.users ?? [];
  const matches = listed.filter((user) => user.email?.toLowerCase() === ownerEmail);
  assert.equal(matches.length, 1, 'expected exactly one approved owner identity');
  const owner = matches[0];
  assert.ok(owner.email_confirmed_at, 'approved owner identity is not confirmed');

  const profiles = await required(table('loopedin_profiles', secretKey, `?id=eq.${owner.id}&select=id,display_name`), 'read owner profile');
  assert.equal(profiles.length, 1, 'owner profile missing');
  assert.equal(profiles[0].display_name, ownerName, 'owner profile name mismatch');
  const groups = await required(table('loopedin_groups', secretKey, `?name=eq.${encodeURIComponent(familyName)}&created_by=eq.${owner.id}&select=id,name,description,kind,created_by`), 'read owner family');
  assert.equal(groups.length, 1, 'expected exactly one approved owner family');
  const group = groups[0];
  assert.equal(group.kind, 'family', 'approved group kind mismatch');
  const memberships = await required(table('loopedin_group_members', secretKey, `?group_id=eq.${group.id}&select=user_id,role`), 'read family memberships');
  assert.deepEqual(memberships, [{ user_id: owner.id, role: 'owner' }], 'family membership baseline changed');

  const token = await ownerSession(owner.id);
  const events = new Map();
  for (const definition of EVENTS) {
    const event = await ensureEvent(token, owner.id, group.id, definition);
    events.set(definition.key, event);
    await ensureRsvpAndComment(token, owner.id, event, definition);
  }
  const photoHashes = [];
  for (const photo of PHOTOS) photoHashes.push(await ensurePhoto(token, owner.id, events.get(photo.eventKey), photo));
  const validationEventRemoved = await removeExactValidationEvent(token, owner.id, group.id);

  const finalEvents = await required(table('loopedin_events', token, `?group_id=eq.${group.id}&select=id,title`), 'verify starter events');
  const finalComments = await required(table('loopedin_event_messages', token, `?event_id=in.(${[...events.values()].map((event) => event.id).join(',')})&select=id`), 'verify starter comments');
  const finalMedia = await required(table('loopedin_event_media', token, `?event_id=in.(${[...events.values()].map((event) => event.id).join(',')})&status=eq.active&select=id`), 'verify starter media');
  assert.equal(finalEvents.length, EVENTS.length, 'unexpected real-family event count');
  assert.equal(finalComments.length, EVENTS.length, 'unexpected starter comment count');
  assert.equal(finalMedia.length, PHOTOS.length, 'unexpected starter photo count');
  console.log(JSON.stringify({
    family: familyName, owner: ownerName, upcomingTrips: 3, completedTrips: 1,
    ownerRsvps: EVENTS.length, comments: finalComments.length, privatePhotos: finalMedia.length,
    imageSha256: photoHashes, validationEventRemoved,
  }));
}

try {
  await main();
} catch (error) {
  console.error(`hosted owner starter-data seed failed: ${redact(error)}`);
  process.exitCode = 1;
}
