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
  assert.equal(sent.authorName, 'You');
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
