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
  assert.equal((await first.events.listEvents('group-jones-family')).length, 4);

  const event = await first.events.createEvent({
    groupId: 'group-jones-family', title: 'Family test trip',
    startsAt: '2027-01-10T09:00:00-06:00', endsAt: '2027-01-11T17:00:00-06:00',
    location: 'Madison, Wisconsin', description: 'Persistence test',
  });
  await first.rsvps.upsertRsvp({ eventId: event.id, personId: 'person-you', personName: 'Alex Jones', status: 'going' });
  await first.thread.sendMessage(event.id, 'The hotel is booked.');
  await first.media.uploadMedia({ eventId: event.id, fileUri: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=80', caption: 'Test photo' });
  await first.events.createEvent({ groupId: 'group-private', title: 'Other group event', startsAt: '2027-02-01T10:00:00Z', endsAt: '2027-02-01T11:00:00Z', location: 'Elsewhere', description: 'Must stay isolated' });

  const reconstructed = durableAdapter.createDurableLocalLoopedInService(storage);
  assert.equal((await reconstructed.events.getEvent(event.id)).title, 'Family test trip');
  assert.equal((await reconstructed.rsvps.listRsvps(event.id))[0].status, 'going');
  assert.equal((await reconstructed.thread.listMessages(event.id))[0].body, 'The hotel is booked.');
  assert.equal((await reconstructed.media.listMedia(event.id))[0].caption, 'Test photo');
  assert.ok((await reconstructed.events.listEvents('group-jones-family')).every((item) => item.groupId === 'group-jones-family'));
  assert.equal((await reconstructed.events.listEvents('group-private')).length, 1);

  await reconstructed.resetAndReseed();
  assert.equal(await reconstructed.events.getEvent(event.id), null);
  assert.equal((await reconstructed.events.listEvents('group-jones-family')).length, mockData.createMockDatabase().events.length);
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
  let persisted = JSON.stringify({ version: 1, database: { groups: [], events: [], rsvps: [], activity: [], messages: [], memories: [], media: [], notifications: [] } });
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
    getItem: async () => JSON.stringify({ version: 2, database: {} }),
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

test('mock service is group-scoped, chronological, and instance-local', async () => {
  const { mockAdapter, mockData } = loadCompiledModules();
  const seed = mockData.createEmptyMockDatabase();
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
  const service = mockAdapter.createMockLoopedInService(mockData.createEmptyMockDatabase());
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
  seed.messages.push(
    { id: 'message-z', eventId: 'event-a', body: 'Same instant z', authorName: 'Maya', self: false, createdAt: '2026-08-01T10:00:00-05:00' },
    { id: 'message-b', eventId: 'event-b', body: 'Other event', authorName: 'Mia', self: false, createdAt: '2026-08-01T14:00:00Z' },
    { id: 'message-a', eventId: 'event-a', body: 'Earlier', authorName: 'Mia', self: false, createdAt: '2026-08-01T14:30:00Z' },
    { id: 'message-y', eventId: 'event-a', body: 'Same instant y', authorName: 'Maya', self: false, createdAt: '2026-08-01T15:00:00Z' },
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
  assert.match(detail, /onSuccess: \(\) => setMessageDraft\(''\)/);
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
  assert.match(shell, /auth\.configured && auth\.status === 'restoring'/);
  assert.match(shell, /auth\.configured && auth\.groups\?\.length === 0/);
  for (const tab of ['Home', 'Calendar', 'Create', 'Memories', 'Groups']) {
    assert.match(shell, new RegExp(`activeSurface !== 'EventDetail' && activeTab === '${tab}'`));
  }
  assert.doesNotMatch(home, /features\/home\/fixtures|home\/fixtures/);
  assert.doesNotMatch(calendar, /features\/calendar\/fixtures|calendar\/fixtures/);
  assert.doesNotMatch(detail, /features\/events\/fixtures|events\/fixtures/);
  assert.doesNotMatch(store, /rsvpOverrides|persistedEvents|draftEvents/);
});
