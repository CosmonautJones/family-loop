import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const appRoot = path.resolve('C:/Users/Travis/Desktop/Projects/family-loop/app');

function read(rel) {
  return fs.readFileSync(path.join(appRoot, rel), 'utf8');
}

function loadCompiledModules() {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'loopedin-integration-'));
  const tsc = path.join(appRoot, 'node_modules', 'typescript', 'bin', 'tsc');
  execFileSync(process.execPath, [tsc,
    path.join(appRoot, 'src/app/selectors.ts'),
    path.join(appRoot, 'src/services/mockAdapter.ts'),
    path.join(appRoot, 'src/services/mockData.ts'),
    path.join(appRoot, 'src/services/durableLocalAdapter.ts'),
    path.join(appRoot, 'src/features/events/createEvent.ts'),
    path.join(appRoot, 'src/features/memories/derivedHistory.ts'),
    '--outDir', outDir,
    '--module', 'commonjs',
    '--target', 'es2020',
    '--esModuleInterop',
    '--skipLibCheck',
  ]);
  const require = createRequire(path.join(outDir, 'integration-test.cjs'));
  return {
    selectors: require(path.join(outDir, 'app/selectors.js')),
    mockAdapter: require(path.join(outDir, 'services/mockAdapter.js')),
    mockData: require(path.join(outDir, 'services/mockData.js')),
    durableAdapter: require(path.join(outDir, 'services/durableLocalAdapter.js')),
    localActorSession: require(path.join(outDir, 'services/localActorSession.js')),
    createEvent: require(path.join(outDir, 'features/events/createEvent.js')),
    derivedHistory: require(path.join(outDir, 'features/memories/derivedHistory.js')),
  };
}

test('mobile scaffold and event-loop files exist', () => {
  for (const rel of [
    'package.json',
    'app.json',
    'tsconfig.json',
    'App.tsx',
    'src/app/AppProviders.tsx',
    'src/app/queries.ts',
    'src/app/selectors.ts',
    'src/features/auth/AuthSessionProvider.tsx',
    'src/features/events/selectors.ts',
    'src/navigation/AppShell.tsx',
    'src/navigation/useAppShellState.ts',
    'src/screens/HomeScreen.tsx',
    'src/screens/CalendarScreen.tsx',
    'src/screens/CreateEventScreen.tsx',
    'src/screens/EventDetailScreen.tsx',
    'src/services/api.ts',
    'src/services/mockAdapter.ts',
    'src/services/mockData.ts',
    'src/services/supabaseAdapter.ts',
    'src/store/useLoopedInStore.ts',
    'src/types/domain.ts',
  ]) {
    assert.equal(fs.existsSync(path.join(appRoot, rel)), true, `${rel} should exist`);
  }

  assert.equal(fs.existsSync(path.join(appRoot, 'src/data/sampleData.ts')), false);
});

test('durable local service persists the family loop across reconstruction and can reseed', async () => {
  const { durableAdapter, mockData } = loadCompiledModules();
  const values = new Map();
  const storage = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    removeItem: async (key) => { values.delete(key); },
  };
  const first = durableAdapter.createDurableLocalLoopedInService(storage);
  const unsubscribe = first.auth.onAuthStateChange(() => undefined);
  assert.equal(typeof unsubscribe, 'function');
  assert.doesNotThrow(() => unsubscribe());
  const seedGroups = await first.groups.listGroups();
  assert.equal(seedGroups[0].name, 'Jones Family');
  assert.equal(seedGroups[0].members.length, 5);
  assert.equal((await first.groups.listGroupMembers('group-jones-family')).length, 5);
  assert.equal((await first.events.listEvents('group-jones-family')).length, 4);

  const event = await first.events.createEvent({
    groupId: 'group-jones-family', title: 'Family test trip',
    startsAt: '2027-01-10T09:00:00-06:00', endsAt: '2027-01-11T17:00:00-06:00',
    location: 'Madison, Wisconsin', description: 'Persistence test',
  });
  await first.rsvps.upsertRsvp({ eventId: event.id, personId: 'person-you', personName: 'Alex Jones', status: 'going' });
  await first.thread.sendMessage(event.id, 'The hotel is booked.');
  await first.media.uploadMedia({ eventId: event.id, fileUri: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=80', caption: 'Test photo', altText: 'Family beside a lake', sourceName: 'Unsplash', sourceUrl: 'https://unsplash.com', creatorName: 'Unsplash contributor', creatorUrl: 'https://unsplash.com' });
  await assert.rejects(first.events.createEvent({ groupId: 'group-private', title: 'Other group event', startsAt: '2027-02-01T10:00:00Z', endsAt: '2027-02-01T11:00:00Z', location: 'Elsewhere', description: 'Must stay isolated' }), /access/i);

  const reconstructed = durableAdapter.createDurableLocalLoopedInService(storage);
  assert.equal((await reconstructed.events.getEvent(event.id)).title, 'Family test trip');
  assert.equal((await reconstructed.rsvps.listRsvps(event.id))[0].status, 'going');
  assert.equal((await reconstructed.thread.listMessages(event.id))[0].body, 'The hotel is booked.');
  assert.equal((await reconstructed.media.listMedia(event.id))[0].caption, 'Test photo');
  assert.ok((await reconstructed.events.listEvents('group-jones-family')).every((item) => item.groupId === 'group-jones-family'));
  await assert.rejects(reconstructed.events.listEvents('group-private'), /access/i);

  await reconstructed.resetAndReseed();
  assert.equal(await reconstructed.events.getEvent(event.id), null);
  assert.equal((await reconstructed.events.listEvents('group-jones-family')).length, mockData.createMockDatabase().events.length);
});

test('group member reads return the five Jones members, stay group-isolated, and survive durable reconstruction', async () => {
  const { durableAdapter, mockAdapter, mockData } = loadCompiledModules();
  const seed = mockData.createMockDatabase();
  const otherMember = { id: 'person-other', name: 'Other Person', initials: 'OP', avatarUri: '', role: 'member' };
  seed.groups.push({
    id: 'group-other', name: 'Other Family', description: 'Isolation fixture', kind: 'family',
    badge: 'Family', tone: 'sage', memberCount: 1, members: [otherMember],
  });

  const mock = mockAdapter.createMockLoopedInService(seed);
  const jonesMembers = await mock.groups.listGroupMembers('group-jones-family');
  assert.deepEqual(jonesMembers.map((member) => member.id), [
    'person-you', 'person-maya', 'person-emma', 'person-noah', 'person-ruth',
  ]);
  assert.deepEqual(jonesMembers.map((member) => member.role), ['owner', 'member', 'member', 'member', 'member']);
  const grandmaRuth = jonesMembers.find((member) => member.id === 'person-ruth');
  assert.equal(grandmaRuth.name, 'Grandma Ruth');
  assert.equal(grandmaRuth.avatarUri, '');
  const session = await mock.auth.getSession();
  assert.equal(session.userId, 'person-you');
  assert.equal(jonesMembers.find((member) => member.id === session.userId).name, session.displayName);
  await assert.rejects(mock.groups.listGroupMembers('group-other'), /access/i);
  await assert.rejects(mock.groups.listGroupMembers('group-missing'), /access/i);

  const values = new Map();
  const storage = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    removeItem: async (key) => { values.delete(key); },
  };
  const first = durableAdapter.createDurableLocalLoopedInService(storage, () => seed);
  assert.equal((await first.groups.listGroupMembers('group-jones-family')).length, 5);
  const reconstructed = durableAdapter.createDurableLocalLoopedInService(storage, () => seed);
  assert.deepEqual(
    (await reconstructed.groups.listGroupMembers('group-jones-family')).map((member) => member.id),
    jonesMembers.map((member) => member.id),
  );
  await assert.rejects(reconstructed.groups.listGroupMembers('group-other'), /access/i);
});

test('Supabase member adapter scopes memberships before resolving profiles', () => {
  const api = read('src/services/api.ts');
  const supabase = read('src/services/supabaseAdapter.ts');
  const queries = read('src/app/queries.ts');
  assert.match(api, /listGroupMembers\(groupId: string\): Promise<GroupMember\[\]>/);
  assert.match(supabase, /from\('loopedin_group_members'\)[\s\S]*?select\('user_id, role'\)[\s\S]*?eq\('group_id', groupId\)/);
  assert.match(supabase, /const profiles = await getProfiles\(userIds\)/);
  assert.match(queries, /groupMembers: \(groupId: string\)/);
  assert.match(queries, /loopedInService\.groups\.listGroupMembers\(activeGroupId\)/);
});

test('Supabase RSVP identity comes from auth and local profile UI is explicitly a per-tab demo', () => {
  const supabase = read('src/services/supabaseAdapter.ts');
  const authScreen = read('src/screens/AuthScreen.tsx');
  const actorSession = read('src/services/localActorSession.ts');
  const provider = read('src/features/auth/AuthSessionProvider.tsx');
  const detail = read('src/screens/EventDetailScreen.tsx');
  assert.match(supabase, /upsertRsvp[\s\S]*?supabase\.auth\.getUser\(\)[\s\S]*?user_id: userId/);
  assert.doesNotMatch(supabase, /user_id: payload\.personId/);
  assert.match(supabase, /person_name: personName/);
  assert.match(authScreen, /JONES FAMILY · LOCAL DEMO/);
  assert.match(authScreen, /only changes who you are in this browser tab/);
  assert.match(actorSession, /sessionStorage\.getItem\(localActorSessionKey\)/);
  assert.match(actorSession, /sessionStorage\.setItem\(localActorSessionKey, actorId\)/);
  assert.match(provider, /queryClient\.clear\(\)/);
  assert.match(provider, /setActiveGroupId\(''\)/);
  assert.match(detail, /item\.uploadedBy === identity\?\.userId/);
  assert.match(detail, /currentMember\?\.role === 'owner'/);
});

test('local actor sessions isolate family identities while sharing authorized durable records', async () => {
  const { durableAdapter, localActorSession, mockData } = loadCompiledModules();
  const seed = mockData.createMockDatabase();
  const outsider = { id: 'person-outsider', name: 'Outside Person', initials: 'OP', avatarUri: '', role: 'owner' };
  seed.groups.push({ id: 'group-outsider', name: 'Outside Family', description: '', kind: 'family', badge: 'Family', tone: 'sky', memberCount: 1, members: [outsider] });
  seed.events.push({ id: 'event-outsider', groupId: 'group-outsider', creatorId: 'person-outsider', title: 'Private outside plan', startsAt: '2027-01-01T10:00:00Z', endsAt: '2027-01-01T11:00:00Z', location: 'Elsewhere', description: '', statusLabel: 'Plan', visibility: 'group', timeline: [] });
  seed.notifications.push({ id: 'notification-outsider', kind: 'event_update', title: 'Outside only', body: 'Private update', eventId: 'event-outsider', groupId: 'group-outsider', read: false, createdAt: '2026-07-12T10:00:00Z' });

  const values = new Map();
  const storage = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    removeItem: async (key) => { values.delete(key); },
  };
  const alexActor = localActorSession.createMemoryActorSessionStore('person-you');
  const mayaActor = localActorSession.createMemoryActorSessionStore('person-maya');
  const noahActor = localActorSession.createMemoryActorSessionStore('person-noah');
  const outsiderActor = localActorSession.createMemoryActorSessionStore('person-outsider');
  const alex = durableAdapter.createDurableLocalLoopedInService(storage, () => seed, alexActor);
  const maya = durableAdapter.createDurableLocalLoopedInService(storage, () => seed, mayaActor);
  const noah = durableAdapter.createDurableLocalLoopedInService(storage, () => seed, noahActor);
  const outside = durableAdapter.createDurableLocalLoopedInService(storage, () => seed, outsiderActor);

  assert.equal((await alex.auth.getSession()).displayName, 'Alex Jones');
  assert.equal((await maya.auth.getSession()).displayName, 'Maya Jones');
  assert.deepEqual((await maya.auth.listLocalProfiles()).slice(0, 5).map((profile) => profile.id), ['person-you', 'person-maya', 'person-emma', 'person-noah', 'person-ruth']);
  assert.deepEqual((await outside.groups.listGroups()).map((group) => group.id), ['group-outsider']);
  await assert.rejects(outside.groups.getGroup('group-jones-family'), /access/i);
  await assert.rejects(outside.events.getEvent('event-door-county'), /access/i);
  await assert.rejects(outside.rsvps.listRsvps('event-door-county'), /access/i);
  await assert.rejects(outside.thread.listMessages('event-door-county'), /access/i);
  await assert.rejects(outside.media.listMedia('event-door-county'), /access/i);
  assert.deepEqual((await outside.notifications.listNotifications()).map((item) => item.id), ['notification-outsider']);
  assert.deepEqual((await alex.notifications.listNotifications()).map((item) => item.id), ['notification-door-county']);
  await assert.rejects(outside.notifications.markRead('notification-door-county'), /access/i);
  await assert.rejects(alex.notifications.markRead('notification-outsider'), /access/i);
  await alex.notifications.clearAll();
  assert.equal((await outside.notifications.listNotifications())[0].read, false, 'clearing Jones updates must preserve the outside group');
  await outside.notifications.clearAll();
  assert.equal((await outside.notifications.listNotifications())[0].read, true);

  await assert.rejects(maya.groups.updateGroup('group-jones-family', { description: 'Member edit' }), /owner or admin/i);
  await assert.rejects(maya.groups.deleteGroup('group-jones-family'), /family owner/i);
  await alex.groups.updateGroup('group-jones-family', { description: 'Owner-approved family plans.' });
  await assert.rejects(noah.events.updateEvent('event-door-county', { description: 'Noah edit' }), /creator or a family owner/i);
  await maya.events.updateEvent('event-door-county', { description: 'Maya updated the cabin plan.' });
  await alex.events.updateEvent('event-yellowstone', { description: 'Owner clarified the road trip.' });
  const mayaEvent = await maya.events.createEvent({ groupId: 'group-jones-family', title: 'Maya-created plan', startsAt: '2027-02-01T10:00:00Z', endsAt: '2027-02-01T11:00:00Z', location: 'Home', description: '' });
  assert.equal(mayaEvent.creatorId, 'person-maya');
  await assert.rejects(noah.events.deleteEvent(mayaEvent.id), /creator or a family owner/i);
  await alex.events.deleteEvent(mayaEvent.id);

  const mayaRsvp = await maya.rsvps.upsertRsvp({ eventId: 'event-door-county', personId: 'person-you', personName: 'Alex Jones', status: 'declined' });
  assert.equal(mayaRsvp.personId, 'person-maya', 'caller-supplied identity must be ignored');
  assert.equal(mayaRsvp.personName, 'Maya Jones');
  await assert.rejects(maya.rsvps.updateRsvp('event-door-county', 'person-you', { status: 'going' }), /own RSVP/i);

  const [alexMessage, mayaMessage] = await Promise.all([
    alex.thread.sendMessage('event-door-county', 'Alex can bring breakfast.'),
    maya.thread.sendMessage('event-door-county', 'Maya confirmed the cabin.'),
  ]);
  assert.equal(alexMessage.authorId, 'person-you');
  assert.equal(mayaMessage.authorId, 'person-maya');
  const alexView = await alex.thread.listMessages('event-door-county');
  const mayaView = await maya.thread.listMessages('event-door-county');
  assert.equal(alexView.find((message) => message.id === alexMessage.id).self, true);
  assert.equal(alexView.find((message) => message.id === mayaMessage.id).self, false);
  assert.equal(mayaView.find((message) => message.id === mayaMessage.id).self, true);

  const photo = await maya.media.uploadMedia({ eventId: 'event-door-county', fileUri: 'data:image/png;base64,iVBORw0KGgo=', caption: 'Maya cabin photo', altText: 'Cabin porch' });
  assert.equal(photo.uploadedBy, 'person-maya');
  await assert.rejects(noah.media.deleteMedia(photo.id), /person who shared|owner/i);
  await alex.media.deleteMedia(photo.id);
  assert.equal((await maya.media.listMedia('event-door-county')).some((item) => item.id === photo.id), false);

  await alex.auth.logout();
  assert.equal(await alex.auth.getSession(), null);
  assert.equal((await maya.auth.getSession()).userId, 'person-maya', 'one tab signing out must not change another tab');
  await assert.rejects(alex.events.listEvents('group-jones-family'), /choose a family profile/i);
  const reloadedMaya = durableAdapter.createDurableLocalLoopedInService(storage, () => seed, mayaActor);
  assert.equal((await reloadedMaya.auth.getSession()).userId, 'person-maya');
  assert.ok((await reloadedMaya.thread.listMessages('event-door-county')).some((message) => message.id === alexMessage.id));
});

test('durable operations keep the actor captured at invocation across an immediate profile switch', async () => {
  const { durableAdapter, localActorSession } = loadCompiledModules();
  const values = new Map();
  const storage = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    removeItem: async (key) => { values.delete(key); },
  };
  const actor = localActorSession.createMemoryActorSessionStore('person-maya');
  const service = durableAdapter.createDurableLocalLoopedInService(storage, undefined, actor);

  const messagePromise = service.thread.sendMessage('event-door-county', 'Maya started this before switching.');
  actor.setActorId('person-noah');
  const message = await messagePromise;
  assert.equal(message.authorId, 'person-maya');

  actor.setActorId('person-maya');
  const rsvpPromise = service.rsvps.upsertRsvp({ eventId: 'event-door-county', status: 'maybe' });
  actor.setActorId('person-noah');
  assert.equal((await rsvpPromise).personId, 'person-maya');

  actor.setActorId('person-maya');
  const photoPromise = service.media.uploadMedia({ eventId: 'event-door-county', fileUri: 'data:image/png;base64,iVBORw0KGgo=', caption: 'Maya switch photo', altText: 'Cabin entry' });
  actor.setActorId('person-noah');
  assert.equal((await photoPromise).uploadedBy, 'person-maya');

  actor.setActorId('person-maya');
  const readPromise = service.thread.listMessages('event-door-county');
  actor.setActorId('person-noah');
  assert.equal((await readPromise).find((item) => item.id === message.id).self, true);
});

test('v3 durable messages and events migrate to actor-owned v5 records without changing revision', async () => {
  const { durableAdapter, mockData } = loadCompiledModules();
  const legacy = mockData.createMockDatabase();
  for (const message of legacy.messages) delete message.authorId;
  const values = new Map([[durableAdapter.durableDatabaseKey, JSON.stringify({ version: 3, revision: 19, database: legacy })]]);
  const storage = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    removeItem: async (key) => { values.delete(key); },
  };
  const service = durableAdapter.createDurableLocalLoopedInService(storage);
  const messages = await service.thread.listMessages('event-door-county');
  assert.deepEqual(messages.map((message) => message.authorId), ['person-maya', 'person-you']);
  const stored = JSON.parse(values.get(durableAdapter.durableDatabaseKey));
  assert.equal(stored.version, 5);
  assert.equal(stored.revision, 19);
  assert.ok(stored.database.events.every((event) => event.creatorId));
});

test('durable local service surfaces corrupt storage and write errors without silently resetting', async () => {
  const { durableAdapter } = loadCompiledModules();
  let corruptRaw = '{not-json';
  let corruptWrites = 0;
  const corrupt = {
    getItem: async () => corruptRaw,
    setItem: async (_key, value) => { corruptWrites += 1; corruptRaw = value; },
    removeItem: async () => undefined,
  };
  const corruptService = durableAdapter.createDurableLocalLoopedInService(corrupt);
  await assert.rejects(corruptService.groups.listGroups(), /JSON|position|property/i);
  assert.equal(corruptWrites, 0, 'corrupt payload must not be overwritten automatically');
  await corruptService.resetAndReseed();
  assert.equal((await corruptService.groups.listGroups())[0].name, 'Jones Family');
  assert.equal(corruptWrites, 1, 'explicit reset is allowed to overwrite corrupt storage');

  const writeFailure = new Error('storage is full');
  let persisted = JSON.stringify({ version: 5, database: { groups: [{ id: 'group-a', name: 'A', description: '', kind: 'family', badge: 'Family', tone: 'coral', memberCount: 1, members: [{ id: 'person-you', name: 'Alex Jones', initials: 'AJ', avatarUri: '', role: 'owner' }] }], events: [], rsvps: [], activity: [], messages: [], memories: [], media: [], notifications: [] } });
  const failing = {
    getItem: async () => persisted,
    setItem: async () => { throw writeFailure; },
    removeItem: async () => undefined,
  };
  const failingService = durableAdapter.createDurableLocalLoopedInService(failing);
  await assert.rejects(failingService.events.createEvent({ groupId: 'group-a', title: 'Will fail', startsAt: '2027-01-01T10:00:00Z', endsAt: '2027-01-01T11:00:00Z', location: 'Here', description: 'Visible failure' }), /storage is full/);
  assert.deepEqual(await failingService.events.listEvents('group-a'), [], 'failed mutation must roll back in-memory state');

  let unsupportedWrites = 0;
  const unsupported = {
    getItem: async () => JSON.stringify({ version: 6, database: {} }),
    setItem: async () => { unsupportedWrites += 1; },
    removeItem: async () => undefined,
  };
  const unsupportedService = durableAdapter.createDurableLocalLoopedInService(unsupported);
  await assert.rejects(unsupportedService.groups.listGroups(), /unsupported local database version/i);
  assert.equal(unsupportedWrites, 0, 'unsupported payload must not be overwritten');

  const partial = durableAdapter.createDurableLocalLoopedInService({
    getItem: async () => JSON.stringify({ version: 1, database: { groups: [], events: [] } }),
    setItem: async () => assert.fail('partial payload must not be overwritten'),
    removeItem: async () => undefined,
  });
  await assert.rejects(partial.events.listEvents(), /malformed local database payload/i);

  const initialFailure = durableAdapter.createDurableLocalLoopedInService({
    getItem: async () => null,
    setItem: async () => { throw new Error('initial seed write failed'); },
    removeItem: async () => undefined,
  });
  await assert.rejects(initialFailure.groups.listGroups(), /initial seed write failed/);
  await assert.rejects(initialFailure.events.listEvents(), /initial seed write failed/);
});

test('durable local service migrates pre-role v1 members to v5 without losing user data or revision', async () => {
  const { durableAdapter, mockData } = loadCompiledModules();
  const legacy = mockData.createMockDatabase();
  for (const member of legacy.groups[0].members) delete member.role;
  legacy.events.push({
    id: 'event-legacy-custom', groupId: 'group-jones-family', title: 'Retained custom plan',
    startsAt: '2027-06-01T10:00:00Z', endsAt: '2027-06-01T12:00:00Z', location: 'Home',
    description: 'User-created before migration', statusLabel: 'Plan', visibility: 'group', timeline: [],
  });
  legacy.messages.push({ id: 'message-legacy-custom', eventId: 'event-legacy-custom', body: 'Keep this note.', authorName: 'Alex Jones', self: true, createdAt: '2027-05-01T10:00:00Z' });
  legacy.notifications.push({ id: 'notification-legacy-custom', kind: 'event_update', title: 'Keep', body: 'Preserved', groupId: 'group-jones-family', read: false, createdAt: '2027-05-01T10:00:00Z' });

  const values = new Map([[durableAdapter.durableDatabaseKey, JSON.stringify({ version: 1, revision: 7, database: legacy })]]);
  let writes = 0;
  const storage = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => { writes += 1; values.set(key, value); },
    removeItem: async (key) => { values.delete(key); },
  };
  const migrated = durableAdapter.createDurableLocalLoopedInService(storage);
  const members = await migrated.groups.listGroupMembers('group-jones-family');
  assert.deepEqual(members.map((member) => member.role), ['owner', 'member', 'member', 'member', 'member']);
  assert.equal((await migrated.events.getEvent('event-legacy-custom')).description, 'User-created before migration');
  assert.equal((await migrated.thread.listMessages('event-legacy-custom'))[0].body, 'Keep this note.');
  assert.ok((await migrated.notifications.listNotifications()).some((item) => item.id === 'notification-legacy-custom'));
  const stored = JSON.parse(values.get(durableAdapter.durableDatabaseKey));
  assert.equal(stored.version, 5);
  assert.equal(stored.database.messages.find((message) => message.id === 'message-legacy-custom').authorId, 'person-you');
  assert.equal(stored.revision, 7);
  assert.equal(writes, 1);

  const reconstructed = durableAdapter.createDurableLocalLoopedInService(storage);
  assert.deepEqual((await reconstructed.groups.listGroupMembers('group-jones-family')).map((member) => member.role), members.map((member) => member.role));
  assert.equal((await reconstructed.events.getEvent('event-legacy-custom')).title, 'Retained custom plan');
  assert.equal(writes, 1, 'a migrated v5 envelope must remain stable on later reconstruction');

  const legacyRaw = JSON.stringify({ version: 1, revision: 7, database: legacy });
  const failedMigration = durableAdapter.createDurableLocalLoopedInService({
    getItem: async () => legacyRaw,
    setItem: async () => { throw new Error('migration write failed'); },
    removeItem: async () => undefined,
  });
  await assert.rejects(failedMigration.groups.listGroupMembers('group-jones-family'), /migration write failed/);
});

test('media uploads are event-scoped, accessible, attributed when remote, removable, and v2-safe', async () => {
  const { durableAdapter, mockAdapter, mockData } = loadCompiledModules();
  const service = mockAdapter.createMockLoopedInService();
  const local = await service.media.uploadMedia({
    eventId: 'event-door-county',
    fileUri: 'data:image/png;base64,iVBORw0KGgo=',
    caption: 'Cabin arrival',
    altText: 'The family standing outside the cabin',
  });
  assert.equal(local.altText, 'The family standing outside the cabin');
  assert.deepEqual((await service.media.listMedia('event-door-county')).map((item) => item.id), [local.id]);
  assert.deepEqual(await service.media.listMedia('event-yellowstone'), []);
  await service.media.deleteMedia(local.id);
  assert.deepEqual(await service.media.listMedia('event-door-county'), []);
  await assert.rejects(service.media.deleteMedia(local.id), /missing media/i);
  await assert.rejects(service.media.uploadMedia({ eventId: 'event-door-county', fileUri: 'data:text/plain;base64,aGk=', altText: 'Text' }), /JPEG, PNG, or WebP/i);
  await assert.rejects(service.media.uploadMedia({ eventId: 'event-door-county', fileUri: `data:image/jpeg;base64,${'A'.repeat(1398108)}`, altText: 'Large photo' }), /no larger than 1 MB/i);
  await assert.rejects(service.media.uploadMedia({ eventId: 'event-door-county', fileUri: 'https://example.com/photo.jpg', altText: 'Remote photo' }), /source name, source link, and creator name/i);
  await assert.rejects(service.media.uploadMedia({ eventId: 'event-door-county', fileUri: 'https://example.com/photo.jpg', altText: 'Remote photo', sourceName: 'Unsplash', sourceUrl: 'https://example.com', creatorName: 'Someone', creatorUrl: 'https://unsplash.com/@someone' }), /must link to unsplash\.com/i);
  await assert.rejects(service.media.uploadMedia({ eventId: 'event-door-county', fileUri: 'data:image/png;base64,aGk=', altText: '   ' }), /describe the photo/i);

  const legacy = mockData.createMockDatabase();
  delete legacy.media[0].altText;
  const values = new Map([[durableAdapter.durableDatabaseKey, JSON.stringify({ version: 2, revision: 12, database: legacy })]]);
  const storage = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    removeItem: async (key) => { values.delete(key); },
  };
  const migrated = durableAdapter.createDurableLocalLoopedInService(storage);
  assert.equal((await migrated.media.listMedia('event-lake-geneva'))[0].altText, legacy.media[0].caption);
  const envelope = JSON.parse(values.get(durableAdapter.durableDatabaseKey));
  assert.equal(envelope.version, 5);
  assert.equal(envelope.revision, 12);
});

test('media Query contract is exact-event keyed and invalidates after add or remove', () => {
  const queries = read('src/app/queries.ts');
  assert.match(queries, /media: \(eventId: string\) => \['media', eventId\]/);
  assert.match(queries, /useEventMediaQuery[\s\S]*?listMedia\(eventId\)/);
  assert.match(queries, /useUploadMediaMutation[\s\S]*?queryKeys\.media\(media\.eventId\)/);
  assert.match(queries, /useDeleteMediaMutation[\s\S]*?queryKeys\.media\(eventId\)/);
});

test('durable local services serialize stale-instance mutations and advance revisions', async () => {
  const { durableAdapter } = loadCompiledModules();
  const values = new Map();
  const storage = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    removeItem: async (key) => { values.delete(key); },
  };
  const first = durableAdapter.createDurableLocalLoopedInService(storage);
  const second = durableAdapter.createDurableLocalLoopedInService(storage);
  await Promise.all([first.groups.listGroups(), second.groups.listGroups()]);
  const initialRevision = JSON.parse(values.get(durableAdapter.durableDatabaseKey)).revision;

  const [eventA, eventB] = await Promise.all([
    first.events.createEvent({ groupId: 'group-jones-family', title: 'First family plan', startsAt: '2027-03-01T10:00:00Z', endsAt: '2027-03-01T11:00:00Z', location: 'Park', description: 'From A' }),
    second.events.createEvent({ groupId: 'group-jones-family', title: 'Second family plan', startsAt: '2027-03-02T10:00:00Z', endsAt: '2027-03-02T11:00:00Z', location: 'Lake', description: 'From B' }),
  ]);
  await Promise.all([
    first.rsvps.upsertRsvp({ eventId: eventA.id, personId: 'person-you', personName: 'Alex Jones', status: 'going' }),
    second.thread.sendMessage(eventB.id, 'I saved both dates.'),
    first.media.uploadMedia({ eventId: eventA.id, fileUri: 'https://example.com/photo.jpg', caption: 'Shared photo', altText: 'Family sharing a trip photo', sourceName: 'Example', sourceUrl: 'https://example.com/photo', creatorName: 'Example photographer', creatorUrl: 'https://example.com/photographer' }),
  ]);

  const reconstructed = durableAdapter.createDurableLocalLoopedInService(storage);
  const events = await reconstructed.events.listEvents('group-jones-family');
  assert.ok(events.some((event) => event.id === eventA.id));
  assert.ok(events.some((event) => event.id === eventB.id));
  assert.equal((await reconstructed.rsvps.listRsvps(eventA.id))[0].status, 'going');
  assert.equal((await reconstructed.thread.listMessages(eventB.id))[0].body, 'I saved both dates.');
  assert.equal((await reconstructed.media.listMedia(eventA.id))[0].caption, 'Shared photo');
  assert.equal(JSON.parse(values.get(durableAdapter.durableDatabaseKey)).revision, initialRevision + 5);
});

test('durable stringify failures preserve acknowledged state and reset revisions safely', async () => {
  const { durableAdapter } = loadCompiledModules();
  const values = new Map();
  const storage = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    removeItem: async (key) => { values.delete(key); },
  };
  const service = durableAdapter.createDurableLocalLoopedInService(storage);
  const retained = await service.events.createEvent({ groupId: 'group-jones-family', title: 'Retained plan', startsAt: '2027-04-01T10:00:00Z', endsAt: '2027-04-01T11:00:00Z', location: 'Home', description: 'Keep me' });
  const circular = {};
  circular.self = circular;
  await assert.rejects(service.events.createEvent({ groupId: 'group-jones-family', title: 'Circular plan', startsAt: '2027-04-02T10:00:00Z', endsAt: '2027-04-02T11:00:00Z', location: 'Home', description: circular }), /circular|serialize|JSON/i);
  assert.equal((await service.events.getEvent(retained.id)).title, 'Retained plan');
  assert.equal((await durableAdapter.createDurableLocalLoopedInService(storage).events.getEvent(retained.id)).title, 'Retained plan');

  const beforeReset = JSON.parse(values.get(durableAdapter.durableDatabaseKey)).revision;
  await service.resetAndReseed();
  assert.equal(JSON.parse(values.get(durableAdapter.durableDatabaseKey)).revision, beforeReset + 1);
  assert.equal(await service.events.getEvent(retained.id), null);
});

test('explicit Supabase mode has a visible missing-config path and never selects durable local fallback', () => {
  const serviceIndex = read('src/services/index.ts');
  assert.match(serviceIndex, /dataMode === 'supabase'/);
  assert.match(serviceIndex, /createUnavailableSupabaseService/);
  assert.match(serviceIndex, /Supabase data mode requires/);
  assert.doesNotMatch(serviceIndex, /dataMode === 'supabase' && hasSupabaseConfig/);
});

test('App entry composes the navigation shell', () => {
  const content = read('App.tsx');
  assert.match(content, /AppShell/);
  assert.doesNotMatch(content, /Lake Picnic with Family/);
});

test('web routes preserve tabs and exact event IDs while unknown hashes safely return Home', () => {
  const { selectors } = loadCompiledModules();
  for (const tab of selectors.appTabs) {
    const hash = selectors.formatAppRoute({ surface: tab });
    assert.deepEqual(selectors.parseAppRoute(hash), { surface: tab });
  }
  const eventRoute = { surface: 'EventDetail', eventId: 'event/family weekend', returnTab: 'Calendar' };
  const hash = selectors.formatAppRoute(eventRoute);
  assert.equal(hash, '#/event/event%2Ffamily%20weekend?from=calendar');
  assert.deepEqual(selectors.parseAppRoute(hash), eventRoute);
  assert.deepEqual(selectors.parseAppRoute('#/unknown'), { surface: 'Home' });
  assert.deepEqual(selectors.parseAppRoute('#/event/%E0%A4%A'), { surface: 'Home' });
});

test('Family screen is service-backed with truthful states and no fixture onboarding controls', () => {
  const family = read('src/screens/GroupsScreen.tsx');
  const shell = read('src/navigation/AppShell.tsx');
  assert.match(family, /useActiveGroupQuery/);
  assert.match(family, /useActiveGroupMembersQuery/);
  assert.match(family, /useActiveEventsQuery/);
  assert.match(family, /Loading your family/);
  assert.match(family, /Try again/);
  assert.match(family, /No family members are available yet/);
  assert.doesNotMatch(family, /features\/groups\/fixtures|Create group|friend-group/);
  assert.match(shell, /accessibilityState=\{\{ selected: tab\.active \}\}/);
  assert.match(shell, /aria-selected=\{tab\.active\}/);
  assert.match(shell, /accessibilityRole="tablist"/);
  assert.match(shell, /accessibilityRole="tab"/);
  assert.match(shell, /tabIndex=\{0\}/);
  assert.doesNotMatch(shell, /tabIndex=\{tab\.active \? 0 : -1\}/);
  assert.doesNotMatch(shell, />Selected<\/Text>/);
  assert.doesNotMatch(shell, /accessibilityLabel=\{`\$\{tab\.label\}/);
  assert.match(shell, /function ActiveFamilyLabel\(\)/);
  assert.ok(shell.indexOf('<ActiveFamilyLabel />') > shell.indexOf("auth.groups?.length === 0"), 'family query child renders after auth gates');
  const shellState = read('src/navigation/useAppShellState.ts');
  assert.match(shellState, /canGoBack: false/);
  assert.match(shellState, /pushState\(\{ loopedIn: true, canGoBack: true \}/);
  assert.match(shellState, /historyState\?\.loopedIn && historyState\.canGoBack/);
  assert.doesNotMatch(shellState, /history\.length/);
});

test('mobile shell and primary flows expose landmarks, headings, useful image names, and form errors', () => {
  const shell = read('src/navigation/AppShell.tsx');
  const create = read('src/screens/CreateEventScreen.tsx');
  const detail = read('src/screens/EventDetailScreen.tsx');
  const photoCard = read('src/components/PhotoCard.tsx');
  const avatar = read('src/components/Avatar.tsx');
  const mainIndex = shell.indexOf('<View role="main"');
  const navIndex = shell.indexOf('accessibilityRole="tablist"');

  assert.ok(navIndex >= 0 && navIndex < mainIndex, 'fixed navigation precedes the main landmark in DOM order');
  assert.match(shell, /fontSize: 11/);
  assert.match(shell, /paddingBottom: 180/);
  assert.match(create, /inputRefs\.current\[firstInvalid\]\?\.focus\(\)/);
  assert.match(create, /'aria-describedby': `\$\{field\.key\}-error`/);
  assert.match(create, /'aria-invalid': true/);
  assert.match(create, /nativeID=\{`\$\{field\.key\}-error`\}/);
  assert.match(create, /role="heading"/);
  assert.match(detail, /`Remove \$\{item\.caption\}`/);
  assert.match(detail, /role="heading"/);
  assert.match(photoCard, /accessibilityLabel=\{\[title, subtitle\]\.filter\(Boolean\)\.join\('\. '\)\}/);
  assert.match(avatar, /accessible=\{false\}/);
});

test('Family roles come from membership data and decorative glows cannot widen the document', () => {
  const { selectors, mockData } = loadCompiledModules();
  const database = mockData.createMockDatabase();
  const family = selectors.selectFamilyViewModel(database.groups[0], database.groups[0].members, database.events, new Date('2026-07-13T12:00:00Z'));
  assert.deepEqual(family.members.map((member) => member.role), ['Owner', 'Family member', 'Family member', 'Family member', 'Family member']);
  const selectorsSource = read('src/app/selectors.ts');
  assert.doesNotMatch(selectorsSource, /member\.id === 'person-you'/);
  const background = read('src/components/AppBackground.tsx');
  assert.match(background, /overflow: 'hidden'/);
  assert.match(background, /maxWidth: '100%'/);
});

test('mock service completes create, refetch, same-detail, and RSVP loop', async () => {
  const { selectors, mockAdapter, mockData } = loadCompiledModules();
  const seed = mockData.createEmptyMockDatabase();
  seed.groups.push({
    id: 'group-integration',
    name: 'Integration Family',
    description: 'Test group',
    kind: 'family',
    badge: 'Family',
    tone: 'coral',
    memberCount: 1,
    members: [{ id: 'person-you', name: 'Alex Jones', initials: 'AJ', avatarUri: '', role: 'owner' }],
  });
  const service = mockAdapter.createMockLoopedInService(seed);
  const payload = {
    groupId: 'group-integration',
    title: 'Future lake day',
    startsAt: '2026-08-15T15:00:00-05:00',
    endsAt: '2026-08-15T18:00:00-05:00',
    location: 'North shore',
    description: 'Bring towels',
  };

  assert.deepEqual(await service.events.listEvents('group-integration'), []);
  const created = await service.events.createEvent(payload);
  const refetched = await service.events.listEvents('group-integration');
  assert.equal(refetched.length, 1);
  assert.equal(refetched[0].id, created.id);

  const home = selectors.selectHomeViewModel({ events: refetched, now: new Date('2026-08-01T00:00:00Z') });
  const calendar = selectors.selectCalendarViewModel(refetched);
  assert.equal(home.heroEvent.id, created.id);
  assert.equal(calendar.agenda[0].id, created.id);

  const exactDetail = await service.events.getEvent(created.id);
  assert.equal(exactDetail.id, created.id);
  assert.equal(exactDetail.title, payload.title);
  assert.equal(selectors.selectEventDetailViewModel(exactDetail, [], []).id, created.id);
  assert.equal(await service.events.getEvent('event-does-not-exist'), null);

  const session = await service.auth.getSession();
  await service.rsvps.upsertRsvp({
    eventId: created.id,
    personId: session.userId,
    personName: session.displayName,
    status: 'going',
  });
  await service.rsvps.upsertRsvp({
    eventId: created.id,
    personId: session.userId,
    personName: session.displayName,
    status: 'maybe',
  });
  const rsvps = await service.rsvps.listRsvps(created.id);
  assert.equal(rsvps.length, 1);
  assert.equal(rsvps[0].status, 'maybe');
});

test('event form validates required family-plan details and accepts optional notes', () => {
  const { createEvent } = loadCompiledModules();
  assert.deepEqual(createEvent.validateEventForm({ title: '', date: 'July 31', time: 'morning', location: '', description: '' }), {
    title: 'Add a name so your family can recognize the plan.',
    location: 'Add the place everyone should use.',
    date: 'Use a date in YYYY-MM-DD format.',
    time: 'Use a time in HH:MM format.',
  });
  assert.deepEqual(createEvent.validateEventForm({ title: 'Door County weekend', date: '2026-07-31', time: '16:30', location: 'Fish Creek', description: '' }), {});
  assert.deepEqual(createEvent.validateEventForm({ title: 'Impossible trip', date: '2026-02-30', time: '10:00', location: 'Nowhere', description: '' }), {
    date: 'Choose a real calendar date and time.',
  });

  const screen = read('src/screens/CreateEventScreen.tsx');
  assert.match(screen, /catch \{ \/\* The mutation exposes a retryable error below and keeps every field intact/);
  assert.match(screen, /Try saving again/);
  assert.match(screen, /accessibilityLiveRegion="assertive"/);
  assert.match(screen, /disabled=\{createEvent\.isPending/);
  const detail = read('src/screens/EventDetailScreen.tsx');
  assert.match(detail, /No response/);
  assert.match(detail, /Choose a response so your family can plan around you/);
});

test('created trip and RSVP survive durable reconstruction and feed all family plan views', async () => {
  const { durableAdapter, selectors } = loadCompiledModules();
  const values = new Map();
  const storage = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    removeItem: async (key) => { values.delete(key); },
  };
  const first = durableAdapter.createDurableLocalLoopedInService(storage);
  const created = await first.events.createEvent({
    groupId: 'group-jones-family', title: 'Wave 2 family trip', startsAt: '2027-05-01T15:00:00Z',
    endsAt: '2027-05-01T17:00:00Z', location: 'Lakefront', description: '',
  });
  await first.rsvps.upsertRsvp({ eventId: created.id, personId: 'person-you', personName: 'Alex Jones', status: 'declined' });

  const reconstructed = durableAdapter.createDurableLocalLoopedInService(storage);
  const events = await reconstructed.events.listEvents('group-jones-family');
  const exact = await reconstructed.events.getEvent(created.id);
  const family = selectors.selectFamilyViewModel((await reconstructed.groups.listGroups())[0], await reconstructed.groups.listGroupMembers('group-jones-family'), events, new Date('2027-04-01T00:00:00Z'));
  assert.equal(exact.title, 'Wave 2 family trip');
  assert.equal((await reconstructed.rsvps.listRsvps(created.id))[0].status, 'declined');
  const home = selectors.selectHomeViewModel({ events, now: new Date('2027-04-01T00:00:00Z') });
  assert.ok(home.heroEvent.id === created.id || home.upcomingEvents.some((event) => event.id === created.id));
  assert.ok(selectors.selectCalendarViewModel(events).agenda.some((event) => event.id === created.id));
  assert.match(family.upcomingLabel, /upcoming trip/);
});

test('mock service is group-scoped, chronological, and instance-local', async () => {
  const { mockAdapter, mockData } = loadCompiledModules();
  const seed = mockData.createEmptyMockDatabase();
  const alex = { id: 'person-you', name: 'Alex Jones', initials: 'AJ', avatarUri: '', role: 'owner' };
  seed.groups.push(
    { id: 'group-a', name: 'A', description: '', kind: 'family', badge: 'Family', tone: 'coral', memberCount: 1, members: [alex] },
    { id: 'group-b', name: 'B', description: '', kind: 'family', badge: 'Family', tone: 'coral', memberCount: 1, members: [alex] },
  );
  const service = mockAdapter.createMockLoopedInService(seed);
  const base = {
    endsAt: '2026-09-01T11:00:00Z',
    location: 'Test location',
    description: 'Test description',
  };

  await service.events.createEvent({ ...base, groupId: 'group-a', title: 'Sooner', startsAt: '2026-08-01T10:00:00Z' });
  await service.events.createEvent({ ...base, groupId: 'group-b', title: 'Other group', startsAt: '2026-07-01T10:00:00Z' });
  await service.events.createEvent({ ...base, groupId: 'group-a', title: 'Later', startsAt: '2026-09-01T10:00:00Z' });

  const groupA = await service.events.listEvents('group-a');
  assert.deepEqual(groupA.map((event) => event.title), ['Sooner', 'Later']);
  assert.ok(groupA.every((event) => event.groupId === 'group-a'));

  const freshService = mockAdapter.createMockLoopedInService(seed);
  assert.deepEqual(await freshService.events.listEvents('group-a'), []);
});

test('mock service orders mixed-offset events by instant regardless of insertion order', async () => {
  const { mockAdapter, mockData } = loadCompiledModules();
  const seed = mockData.createEmptyMockDatabase();
  seed.groups.push({ id: 'group-offsets', name: 'Offsets', description: '', kind: 'family', badge: 'Family', tone: 'coral', memberCount: 1, members: [{ id: 'person-you', name: 'Alex Jones', initials: 'AJ', avatarUri: '', role: 'owner' }] });
  const service = mockAdapter.createMockLoopedInService(seed);
  const base = {
    groupId: 'group-offsets',
    endsAt: '2026-08-01T16:00:00Z',
    location: 'Test location',
    description: 'Test description',
  };

  await service.events.createEvent({ ...base, title: 'Later instant', startsAt: '2026-08-01T10:00:00-05:00' });
  await service.events.createEvent({ ...base, title: 'Earlier instant', startsAt: '2026-08-01T14:30:00Z' });

  const events = await service.events.listEvents('group-offsets');
  assert.deepEqual(events.map((event) => event.title), ['Earlier instant', 'Later instant']);
});

test('mock thread is event-scoped, rejects blank sends, persists identity, and orders by instant with stable ties', async () => {
  const { mockAdapter, mockData } = loadCompiledModules();
  const seed = mockData.createEmptyMockDatabase();
  const alex = { id: 'person-you', name: 'Alex Jones', initials: 'AJ', avatarUri: '', role: 'owner' };
  seed.groups.push({ id: 'group-thread', name: 'Thread', description: '', kind: 'family', badge: 'Family', tone: 'coral', memberCount: 1, members: [alex] });
  seed.events.push(
    { id: 'event-a', groupId: 'group-thread', title: 'A', startsAt: '2026-08-01T10:00:00Z', endsAt: '2026-08-01T11:00:00Z', location: '', description: '', statusLabel: 'Plan', visibility: 'group', timeline: [] },
    { id: 'event-b', groupId: 'group-thread', title: 'B', startsAt: '2026-08-02T10:00:00Z', endsAt: '2026-08-02T11:00:00Z', location: '', description: '', statusLabel: 'Plan', visibility: 'group', timeline: [] },
  );
  seed.messages.push(
    { id: 'message-z', eventId: 'event-a', body: 'Same instant z', authorId: 'person-maya', authorName: 'Maya', self: false, createdAt: '2026-08-01T10:00:00-05:00' },
    { id: 'message-b', eventId: 'event-b', body: 'Other event', authorId: 'person-mia', authorName: 'Mia', self: false, createdAt: '2026-08-01T14:00:00Z' },
    { id: 'message-a', eventId: 'event-a', body: 'Earlier', authorId: 'person-mia', authorName: 'Mia', self: false, createdAt: '2026-08-01T14:30:00Z' },
    { id: 'message-y', eventId: 'event-a', body: 'Same instant y', authorId: 'person-maya', authorName: 'Maya', self: false, createdAt: '2026-08-01T15:00:00Z' },
  );
  const service = mockAdapter.createMockLoopedInService(seed);

  await assert.rejects(service.thread.sendMessage('event-a', '   '), /write a message/i);
  const sent = await service.thread.sendMessage('event-a', '  We will bring ice  ');
  assert.equal(sent.body, 'We will bring ice');
  assert.equal(sent.authorName, 'Alex Jones');
  assert.equal(sent.self, true);

  const eventA = await service.thread.listMessages('event-a');
  assert.deepEqual(eventA.filter((message) => message.id !== sent.id).map((message) => message.id), ['message-a', 'message-y', 'message-z']);
  assert.equal(eventA.find((message) => message.id === sent.id)?.body, 'We will bring ice');
  assert.ok(eventA.every((message) => message.eventId === 'event-a'));
  assert.deepEqual((await service.thread.listMessages('event-b')).map((message) => message.id), ['message-b']);
});

test('thread Query contract is event-keyed and invalidates after send', () => {
  const queries = read('src/app/queries.ts');
  assert.match(queries, /messages: \(eventId: string\) => \['messages', eventId\]/);
  assert.match(queries, /useEventMessagesQuery/);
  assert.match(queries, /useSendMessageMutation/);
  assert.match(queries, /invalidateQueries\(\{ queryKey: queryKeys\.messages\(message\.eventId\) \}\)/);
});

test('Event Detail renders truthful thread states and a recoverable composer without fixture fallback', () => {
  const detail = read('src/screens/EventDetailScreen.tsx');
  assert.match(detail, /useEventMessagesQuery/);
  assert.match(detail, /useSendMessageMutation/);
  assert.match(detail, /messagesQuery\.isPending/);
  assert.match(detail, /messagesQuery\.isError/);
  assert.match(detail, /messagesQuery\.isSuccess && messagesQuery\.data\.length === 0/);
  assert.match(detail, /key=\{item\.id\}/);
  assert.match(detail, /disabled=\{sendDisabled\}/);
  assert.match(detail, /sendMessage\.isPending/);
  assert.match(detail, /onSuccess: \(\) => setMessageDraft\(\(current\) => current\.trim\(\) === body \? '' : current\)/);
  assert.match(detail, /sendMessage\.isError/);
  assert.doesNotMatch(detail, /eventThread|features\/events\/fixtures/);
});

test('zero-event selectors stay honest and unknown detail is explicit', () => {
  const { selectors } = loadCompiledModules();
  const home = selectors.selectHomeViewModel({ events: [], activity: [], memories: [] });
  const calendar = selectors.selectCalendarViewModel([]);

  assert.equal(home.heroEvent, null);
  assert.deepEqual(home.upcomingEvents, []);
  assert.deepEqual(home.activity, []);
  assert.deepEqual(home.memories, []);
  assert.deepEqual(calendar.agenda, []);
  assert.equal(selectors.selectEventDetailViewModel('event-does-not-exist', [], []), null);
});

test('Calendar excludes completed events before deriving its upcoming month and agenda', () => {
  const { selectors, mockData } = loadCompiledModules();
  const events = mockData.createMockDatabase().events;
  const now = new Date('2026-07-13T12:00:00Z');
  const calendar = selectors.selectCalendarViewModel(events, now);

  assert.deepEqual(calendar.agenda.map((event) => event.id), [
    'event-door-county',
    'event-yellowstone',
    'event-charleston',
  ]);
  assert.equal(calendar.month, 'July');
  assert.equal(calendar.calendarSummary, '3 shared plans');
  assert.equal(calendar.calendarEvents.find((day) => day.day === 24).highlight, true);
  assert.equal(calendar.agenda.some((event) => event.id === 'event-lake-geneva'), false);

  const completedOnly = selectors.selectCalendarViewModel(
    events.filter((event) => event.id === 'event-lake-geneva'),
    now,
  );
  assert.deepEqual(completedOnly.agenda, []);
  assert.equal(completedOnly.month, 'July');
  assert.equal(completedOnly.calendarSummary, '0 shared plans');
  assert.equal(completedOnly.calendarEvents.some((day) => day.highlight), false);
});

test('completed-event history is derived chronologically and keeps exact event comments and photos isolated', () => {
  const { derivedHistory, mockData, selectors } = loadCompiledModules();
  const database = mockData.createMockDatabase();
  const completed = derivedHistory.selectCompletedEvents(database.events, new Date('2026-07-13T12:00:00Z'));

  assert.deepEqual(completed.map((event) => event.id), ['event-lake-geneva']);
  const event = completed[0];
  const foreignMessage = {
    ...database.messages[0], id: 'message-foreign-newer', eventId: 'event-door-county',
    body: 'This belongs to another event.', createdAt: '2026-07-12T10:00:00-05:00',
  };
  const foreignMedia = {
    ...database.media[0], id: 'media-foreign-newer', eventId: 'event-door-county',
    caption: 'Another event photo', uploadedAt: '2026-07-12T11:00:00-05:00',
  };
  const messages = [...database.messages.filter((message) => message.eventId === event.id), foreignMessage];
  const media = [...database.media.filter((item) => item.eventId === event.id), foreignMedia];
  const history = derivedHistory.deriveEventHistory(event, messages, media);
  assert.ok(history.messages.every((message) => message.eventId === event.id));
  assert.ok(history.media.every((item) => item.eventId === event.id));
  assert.equal(history.messages.some((message) => message.id === foreignMessage.id), false);
  assert.equal(history.media.some((item) => item.id === foreignMedia.id), false);
  assert.equal(history.latestActivityAt, '2026-06-15T10:00:00-05:00');

  const memories = selectors.selectMemoriesViewModel([history]);
  assert.deepEqual(memories.map((memory) => memory.id), [event.id]);
  assert.equal(memories[0].photoCount, 3);
  assert.equal(memories[0].commentCount, 1);
});

test('derived family history has truthful empty behavior and excludes unfinished events', () => {
  const { derivedHistory, selectors } = loadCompiledModules();
  const futureEvent = {
    id: 'event-future', groupId: 'group-jones-family', title: 'Future trip',
    startsAt: '2027-08-01T10:00:00Z', endsAt: '2027-08-01T12:00:00Z',
    location: 'Somewhere', description: '', statusLabel: 'Upcoming', coverUri: '',
  };

  assert.deepEqual(derivedHistory.selectCompletedEvents([], new Date('2026-07-13T12:00:00Z')), []);
  assert.deepEqual(derivedHistory.selectCompletedEvents([futureEvent], new Date('2026-07-13T12:00:00Z')), []);
  assert.deepEqual(selectors.selectMemoriesViewModel([]), []);
  const home = selectors.selectHomeViewModel({ events: [futureEvent], history: [], now: new Date('2026-07-13T12:00:00Z') });
  assert.deepEqual(home.activity, []);
  assert.deepEqual(home.memories, []);
});

test('completed-event comments and photos remain truthful after durable reconstruction', async () => {
  const { durableAdapter, derivedHistory, selectors } = loadCompiledModules();
  const values = new Map();
  const storage = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    removeItem: async (key) => { values.delete(key); },
  };
  const first = durableAdapter.createDurableLocalLoopedInService(storage);
  const event = await first.events.createEvent({
    groupId: 'group-jones-family', title: 'Completed test reunion',
    startsAt: '2026-05-01T10:00:00Z', endsAt: '2026-05-01T12:00:00Z',
    location: 'Family cabin', description: 'Durable history proof',
  });
  await first.thread.sendMessage(event.id, 'This belongs only to the reunion.');
  await first.media.uploadMedia({
    eventId: event.id, fileUri: 'https://example.com/reunion.jpg', caption: 'Cabin reunion',
    altText: 'Family outside a cabin', sourceName: 'Example', sourceUrl: 'https://example.com/reunion',
    creatorName: 'Example photographer', creatorUrl: 'https://example.com/photographer',
  });
  await first.thread.sendMessage('event-door-county', 'Other event comment');

  const reconstructed = durableAdapter.createDurableLocalLoopedInService(storage);
  const exactEvent = await reconstructed.events.getEvent(event.id);
  const history = derivedHistory.deriveEventHistory(
    exactEvent,
    await reconstructed.thread.listMessages(event.id),
    await reconstructed.media.listMedia(event.id),
  );
  assert.deepEqual(history.messages.map((message) => message.body), ['This belongs only to the reunion.']);
  assert.deepEqual(history.media.map((item) => item.caption), ['Cabin reunion']);
  assert.deepEqual(selectors.selectMemoriesViewModel([history]).map((memory) => memory.id), [event.id]);
});

test('history UI uses service truth, exact-event navigation, and has no fake reminder or photo counters', () => {
  const queries = read('src/app/queries.ts');
  const memories = read('src/screens/MemoriesScreen.tsx');
  const home = read('src/screens/HomeScreen.tsx');
  const detail = read('src/screens/EventDetailScreen.tsx');
  const shell = read('src/navigation/AppShell.tsx');
  const store = read('src/store/useLoopedInStore.ts');

  assert.match(queries, /useActiveGroupHistoryQuery/);
  assert.match(queries, /queryKeys\.messages\(event\.id\)/);
  assert.match(queries, /queryKeys\.media\(event\.id\)/);
  assert.match(memories, /No completed events yet/);
  assert.match(memories, /onOpenEvent\?\.\(memory\.id\)/);
  assert.match(shell, /MemoriesScreen onOpenEvent=\{\(eventId\) => openEventDetail\('Memories', eventId\)\}/);
  assert.match(home, /useActiveGroupHistoryQuery/);
  for (const source of [home, memories]) assert.doesNotMatch(source, /features\/(home|memories)\/fixtures/);
  for (const source of [detail, store]) assert.doesNotMatch(source, /reminderDraft|toggleReminderDraft|stagedPhotoCounts|stageEventPhoto/);
  assert.doesNotMatch(detail, /Stage reminder|Clear reminder|Push delivery is not wired/);
});

test('Home selector keeps the next event prominent and orders every later event', () => {
  const { selectors, mockData } = loadCompiledModules();
  const template = mockData.createMockDatabase().events[0];
  const events = [
    { ...template, id: 'latest', title: 'Latest', startsAt: '2026-08-20T18:00:00Z', endsAt: '2026-08-20T19:00:00Z' },
    { ...template, id: 'next', title: 'Next', startsAt: '2026-08-02T18:00:00Z', endsAt: '2026-08-02T19:00:00Z' },
    { ...template, id: 'middle', title: 'Middle', startsAt: '2026-08-10T18:00:00Z', endsAt: '2026-08-10T19:00:00Z' },
  ];

  const home = selectors.selectHomeViewModel({ events, now: new Date('2026-08-01T00:00:00Z') });

  assert.equal(home.heroEvent.id, 'next');
  assert.deepEqual(home.upcomingEvents.map((event) => event.id), ['middle', 'latest']);
});

test('Home renders each additional upcoming event with its exact-ID open action', () => {
  const home = read('src/screens/HomeScreen.tsx');

  assert.match(home, /appSections\.upcomingEvents\.map\(\(event\) =>/);
  assert.match(home, /key=\{event\.id\}/);
  assert.match(home, /onOpenEvent\?\.\(event\.id\)/);
});

test('event draft weekday agrees with its August 3 date', () => {
  const eventData = read('src/features/events/eventData.ts');
  assert.match(eventData, /dateLabel: 'Mon · Aug 3'/);
  assert.doesNotMatch(eventData, /dateLabel: 'Sun · Aug 3'/);
});

test('Query and screens expose truthful event states without configured fixture fallback', () => {
  const queries = read('src/app/queries.ts');
  const home = read('src/screens/HomeScreen.tsx');
  const calendar = read('src/screens/CalendarScreen.tsx');
  const detail = read('src/screens/EventDetailScreen.tsx');
  const create = read('src/screens/CreateEventScreen.tsx');
  const shell = read('src/navigation/AppShell.tsx');
  const store = read('src/store/useLoopedInStore.ts');

  assert.match(queries, /useActiveEventsQuery/);
  assert.match(queries, /useEventQuery/);
  assert.match(queries, /useEventRsvpsQuery/);
  assert.match(queries, /enabled:/);
  assert.match(queries, /invalidateQueries/);
  for (const screen of [home, calendar, detail]) {
    assert.match(screen, /isLoading|pending/i);
    assert.match(screen, /error/i);
  }
  assert.match(home, /Create event/);
  assert.match(detail, /not found|couldn['’]t find|missing event/i);
  assert.match(create, /isPending|pending/i);
  assert.match(create, /error/i);
  assert.match(shell, /auth\.status === 'restoring'/);
  assert.match(shell, /auth\.groups\?\.length === 0/);
  for (const tab of ['Home', 'Calendar', 'Create', 'Memories', 'Family']) {
    assert.match(shell, new RegExp(`activeSurface !== 'EventDetail' && activeTab === '${tab}'`));
  }
  assert.doesNotMatch(home, /features\/home\/fixtures|home\/fixtures/);
  assert.doesNotMatch(calendar, /features\/calendar\/fixtures|calendar\/fixtures/);
  assert.doesNotMatch(detail, /features\/events\/fixtures|events\/fixtures/);
  assert.doesNotMatch(store, /rsvpOverrides|persistedEvents|draftEvents/);
});
