import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appRoot = path.join(repoRoot, 'app');

function read(rel) {
  return fs.readFileSync(path.join(appRoot, rel), 'utf8');
}

function assertRepresentativeTimingBudget(samples, budgetMs, label) {
  assert.equal(samples.length, 3, `${label} must use three independent timing samples`);
  const medianMs = [...samples].sort((left, right) => left - right)[1];
  assert.ok(
    medianMs <= budgetMs,
    `${label} median ${medianMs.toFixed(1)}ms exceeded ${budgetMs}ms (samples: ${samples.map((sample) => sample.toFixed(1)).join(', ')}ms)`,
  );
  return medianMs;
}

function loadStorageModule() {
  const appRequire = createRequire(path.join(appRoot, 'package.json'));
  const ts = appRequire('typescript');
  const output = ts.transpileModule(read('src/lib/storage.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  Function('require', 'module', 'exports', output)((id) => id === '@react-native-async-storage/async-storage' ? {} : appRequire(id), module, module.exports);
  return module.exports;
}

let compiledModules;

function loadCompiledModules() {
  if (compiledModules) return compiledModules;
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'loopedin-integration-'));
  const tsc = path.join(appRoot, 'node_modules', 'typescript', 'bin', 'tsc');
  execFileSync(process.execPath, [tsc,
    path.join(appRoot, 'src/app/selectors.ts'),
    path.join(appRoot, 'src/services/mockAdapter.ts'),
    path.join(appRoot, 'src/services/mockData.ts'),
    path.join(appRoot, 'src/services/durableLocalAdapter.ts'),
    path.join(appRoot, 'src/features/events/createEvent.ts'),
    path.join(appRoot, 'src/features/memories/derivedHistory.ts'),
    path.join(appRoot, 'src/features/auth/invitationRoute.ts'),
    path.join(appRoot, 'src/features/auth/invitationDraft.ts'),
    path.join(appRoot, 'src/features/account/dataExport.ts'),
    path.join(appRoot, 'src/services/serviceErrors.ts'),
    path.join(appRoot, 'src/services/messageSubscription.ts'),
    path.join(appRoot, 'src/app/queryReconciliation.ts'),
    path.join(appRoot, 'src/app/protectedQueries.ts'),
    '--outDir', outDir,
    '--module', 'commonjs',
    '--target', 'es2020',
    '--esModuleInterop',
    '--skipLibCheck',
  ]);
  const require = createRequire(path.join(outDir, 'integration-test.cjs'));
  compiledModules = {
    selectors: require(path.join(outDir, 'app/selectors.js')),
    mockAdapter: require(path.join(outDir, 'services/mockAdapter.js')),
    mockData: require(path.join(outDir, 'services/mockData.js')),
    durableAdapter: require(path.join(outDir, 'services/durableLocalAdapter.js')),
    localActorSession: require(path.join(outDir, 'services/localActorSession.js')),
    createEvent: require(path.join(outDir, 'features/events/createEvent.js')),
    derivedHistory: require(path.join(outDir, 'features/memories/derivedHistory.js')),
    invitationRoute: require(path.join(outDir, 'features/auth/invitationRoute.js')),
    invitationDraft: require(path.join(outDir, 'features/auth/invitationDraft.js')),
    dataExport: require(path.join(outDir, 'features/account/dataExport.js')),
    clientErrorTelemetry: require(path.join(outDir, 'services/clientErrorTelemetry.js')),
    serviceErrors: require(path.join(outDir, 'services/serviceErrors.js')),
    messageSubscription: require(path.join(outDir, 'services/messageSubscription.js')),
    queryReconciliation: require(path.join(outDir, 'app/queryReconciliation.js')),
    protectedQueries: require(path.join(outDir, 'app/protectedQueries.js')),
  };
  return compiledModules;
}

test('mobile scaffold and event-loop files exist', () => {
  for (const rel of [
    'package.json',
    'app.json',
    'tsconfig.json',
    'App.tsx',
    'src/app/AppProviders.tsx',
    'src/app/queries.ts',
    'src/app/queryReconciliation.ts',
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

test('compiled integration modules are reused without sharing service state', async () => {
  const firstModules = loadCompiledModules();
  const secondModules = loadCompiledModules();
  assert.strictEqual(secondModules, firstModules);

  const firstService = firstModules.mockAdapter.createMockLoopedInService();
  const secondService = secondModules.mockAdapter.createMockLoopedInService();
  const baselineEventCount = (await secondService.events.listEvents('group-jones-family')).length;
  await firstService.events.createEvent({
    groupId: 'group-jones-family',
    title: 'Only in the first service',
    startsAt: '2027-05-01T15:00:00Z',
    endsAt: '2027-05-01T17:00:00Z',
    location: 'Lakefront',
    description: '',
  });
  assert.equal((await firstService.events.listEvents('group-jones-family')).length, baselineEventCount + 1);
  assert.equal((await secondService.events.listEvents('group-jones-family')).length, baselineEventCount);
});

test('encrypted account export contains only the current user contributions and verifies integrity', async () => {
  const { dataExport, mockAdapter, mockData } = loadCompiledModules();
  const database = mockData.createMockDatabase();
  const ownMessage = database.messages.find((item) => item.authorId === 'person-you');
  assert.ok(ownMessage);
  ownMessage.author = { id: 'person-you', name: 'Alex Jones', initials: 'AJ', avatarUri: 'https://private.example/avatar?token=credential' };
  const service = mockAdapter.createMockLoopedInService(database);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(Uint8Array.from([137, 80, 78, 71]), { headers: { 'content-type': 'image/png' } });
  try {
    const alexSession = await service.auth.chooseLocalProfile('person-you');
    const alex = await dataExport.collectCurrentUserData(service, alexSession, '2026-07-14T12:00:00.000Z');
    assert.equal(alex.account.userId, 'person-you');
    assert.ok(alex.memberships.length > 0);
    assert.ok(alex.createdEvents.every((item) => item.creatorId === 'person-you' && !('coverUri' in item)));
    assert.ok(alex.rsvps.every((item) => item.personId === 'person-you'));
    assert.ok(alex.messages.every((item) => item.authorId === 'person-you'));
    assert.ok(alex.messages.every((item) => !('author' in item)));
    assert.ok(alex.media.every((item) => item.uploadedBy === 'person-you' && !('uri' in item)));
    assert.ok(alex.media.every((item) => item.file?.sha256 && item.file.byteLength === 4));

    const encrypted = await dataExport.encryptUserDataExport(alex, 'correct horse family');
    const decrypted = await dataExport.decryptUserDataExport(encrypted.bundle, 'correct horse family');
    assert.deepEqual(decrypted.data, alex);
    assert.equal(decrypted.manifest.counts.mediaFiles, alex.media.length);
    assert.doesNotMatch(JSON.stringify(decrypted), /X-Amz-|token=|signature=/i);
    await assert.rejects(dataExport.decryptUserDataExport(encrypted.bundle, 'wrong passphrase'), /incorrect|changed|damaged/i);

    const changed = structuredClone(encrypted.bundle);
    changed.ciphertextBase64 = `${changed.ciphertextBase64.slice(0, -2)}AA`;
    await assert.rejects(dataExport.decryptUserDataExport(changed, 'correct horse family'), /changed|damaged/i);

    const inconsistent = structuredClone(decrypted);
    inconsistent.manifest.counts.messages += 1;
    await assert.rejects(dataExport.verifyUserDataExportPlaintext(inconsistent), /integrity check/i);
    const wrongScope = structuredClone(decrypted);
    wrongScope.manifest.scope = 'other-scope';
    await assert.rejects(dataExport.verifyUserDataExportPlaintext(wrongScope), /integrity check/i);

    const mayaSession = await service.auth.chooseLocalProfile('person-maya');
    const maya = await dataExport.collectCurrentUserData(service, mayaSession, '2026-07-14T12:01:00.000Z');
    assert.equal(maya.account.userId, 'person-maya');
    assert.ok(maya.rsvps.every((item) => item.personId === 'person-maya'));
    assert.ok(maya.messages.every((item) => item.authorId === 'person-maya'));
    assert.ok(maya.media.every((item) => item.uploadedBy === 'person-maya'));
    assert.notDeepEqual(maya, alex);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('account export reports an unavailable photo and succeeds on a later retry', async () => {
  const { dataExport, mockAdapter } = loadCompiledModules();
  const service = mockAdapter.createMockLoopedInService();
  const session = await service.auth.chooseLocalProfile('person-you');
  const originalFetch = globalThis.fetch;
  let fail = true;
  globalThis.fetch = async () => fail
    ? new Response('unavailable', { status: 503 })
    : new Response(Uint8Array.from([255, 216, 255, 217]), { headers: { 'content-type': 'image/jpeg' } });
  try {
    const first = await dataExport.collectCurrentUserData(service, session);
    const firstEncrypted = await dataExport.encryptUserDataExport(first, 'retry family export');
    assert.equal(firstEncrypted.manifest.counts.unavailableMediaFiles, first.media.length);
    fail = false;
    const second = await dataExport.collectCurrentUserData(service, session);
    const secondEncrypted = await dataExport.encryptUserDataExport(second, 'retry family export');
    assert.equal(secondEncrypted.manifest.counts.unavailableMediaFiles, 0);
    assert.equal(secondEncrypted.manifest.counts.mediaFiles, second.media.length);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('account export caps streamed media before buffering and aborts hung reads', async () => {
  const { dataExport, mockAdapter } = loadCompiledModules();
  const service = mockAdapter.createMockLoopedInService();
  const session = await service.auth.chooseLocalProfile('person-you');
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(700_000));
        controller.enqueue(new Uint8Array(700_000));
        controller.close();
      },
    }), { headers: { 'content-type': 'image/jpeg' } });
    const oversized = await dataExport.collectCurrentUserData(service, session, new Date().toISOString(), { mediaRequestTimeoutMs: 100 });
    assert.ok(oversized.media.every((item) => item.file === null));

    globalThis.fetch = async (_uri, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true });
    });
    const hung = await dataExport.collectCurrentUserData(service, session, new Date().toISOString(), { mediaRequestTimeoutMs: 10 });
    assert.ok(hung.media.every((item) => item.file === null));
  } finally {
    globalThis.fetch = originalFetch;
  }
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

test('event and comment retries replay committed results without duplicate durable rows', async () => {
  const { durableAdapter, localActorSession } = loadCompiledModules();
  const values = new Map();
  const storage = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    removeItem: async (key) => { values.delete(key); },
  };
  const alex = durableAdapter.createDurableLocalLoopedInService(storage, undefined, localActorSession.createMemoryActorSessionStore('person-you'));
  const eventPayload = {
    operationKey: '11111111-1111-4111-8111-111111111111', groupId: 'group-jones-family', title: 'Response-loss plan',
    startsAt: '2027-05-01T10:00:00Z', endsAt: '2027-05-01T12:00:00Z', location: 'Home', description: 'Committed before the response vanished',
  };

  const firstEvent = await alex.events.createEvent(eventPayload); // Simulate a committed response the caller never receives.
  const revisionAfterCommit = JSON.parse(values.get(durableAdapter.durableDatabaseKey)).revision;
  const retriedEvent = await alex.events.createEvent(eventPayload);
  const afterEventRetry = JSON.parse(values.get(durableAdapter.durableDatabaseKey));
  assert.equal(retriedEvent.id, firstEvent.id);
  assert.equal(afterEventRetry.revision, revisionAfterCommit, 'a replay must not publish a second durable write');
  assert.equal(afterEventRetry.database.events.filter((event) => event.title === eventPayload.title).length, 1);

  const distinctEvent = await alex.events.createEvent({ ...eventPayload, operationKey: '22222222-2222-4222-8222-222222222222' });
  assert.notEqual(distinctEvent.id, firstEvent.id, 'distinct operations remain distinct even with identical content');

  const maya = durableAdapter.createDurableLocalLoopedInService(storage, undefined, localActorSession.createMemoryActorSessionStore('person-maya'));
  const mayaEvent = await maya.events.createEvent(eventPayload);
  assert.notEqual(mayaEvent.id, firstEvent.id, 'another actor cannot replay the first actor’s operation');
  assert.equal(mayaEvent.creatorId, 'person-maya');

  const messageKey = '33333333-3333-4333-8333-333333333333';
  const firstMessage = await alex.thread.sendMessage(firstEvent.id, 'Response-loss comment', messageKey);
  const messageRevision = JSON.parse(values.get(durableAdapter.durableDatabaseKey)).revision;
  const retriedMessage = await alex.thread.sendMessage(firstEvent.id, 'Response-loss comment', messageKey);
  const afterMessageRetry = JSON.parse(values.get(durableAdapter.durableDatabaseKey));
  assert.equal(retriedMessage.id, firstMessage.id);
  assert.equal(afterMessageRetry.revision, messageRevision);
  assert.equal(afterMessageRetry.database.messages.filter((message) => message.id === firstMessage.id).length, 1);

  const distinctMessage = await alex.thread.sendMessage(firstEvent.id, 'Response-loss comment', '44444444-4444-4444-8444-444444444444');
  assert.notEqual(distinctMessage.id, firstMessage.id);
  const mayaMessage = await maya.thread.sendMessage(firstEvent.id, 'Response-loss comment', messageKey);
  assert.notEqual(mayaMessage.id, firstMessage.id, 'another actor cannot replay the first actor’s comment operation');
  assert.equal(mayaMessage.authorId, 'person-maya');
});

test('Supabase event and comment operation keys stay private and membership-locked through commit', () => {
  const migration = fs.readFileSync(path.join(repoRoot, 'supabase', 'migrations', '20260714140000_loopedin_create_idempotency.sql'), 'utf8');
  assert.match(migration, /loopedin_private\.loopedin_event_create_operations/);
  assert.match(migration, /loopedin_private\.loopedin_message_create_operations/);
  assert.doesNotMatch(migration, /alter table public\.loopedin_(?:events|event_messages).*operation_key/is);
  assert.equal((migration.match(/for key share;/g) ?? []).length, 3, 'event membership plus comment event/membership rows must stay locked through commit');
  assert.match(migration, /revoke all on loopedin_private\.loopedin_event_create_operations from public, anon, authenticated/);
  assert.match(migration, /revoke all on loopedin_private\.loopedin_message_create_operations from public, anon, authenticated/);
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
  assert.match(supabase, /listNotifications[\s\S]*?select\('id, user_id,[\s\S]*?\.eq\('user_id', userId\)/);
  assert.match(supabase, /markRead[\s\S]*?\.eq\('id', notificationId\)\.eq\('user_id', userId\)/);
  assert.match(supabase, /clearAll[\s\S]*?\.eq\('user_id', userId\)\.eq\('read', false\)/);
  assert.match(authScreen, /JONES FAMILY · LOCAL DEMO/);
  assert.match(authScreen, /only changes who you are in this browser tab/);
  assert.match(actorSession, /sessionStorage\.getItem\(localActorSessionKey\)/);
  assert.match(actorSession, /sessionStorage\.setItem\(localActorSessionKey, actorId\)/);
  assert.match(provider, /queryClient\.clear\(\)/);
  assert.match(provider, /setActiveGroupId\(''\)/);
  assert.match(detail, /item\.uploadedBy === identity\?\.userId/);
  assert.match(detail, /currentMember\?\.role === 'owner'/);
});

test('Supabase error boundary redacts backend details and keeps recovery categories actionable', () => {
  const { serviceErrors } = loadCompiledModules();
  const cases = [
    [{ message: 'JWT expired bearer secret-access-token', status: 401, code: 'PGRST301' }, 'session'],
    [{ message: 'permission denied for /families/private/message-body', status: 403, code: '42501' }, 'access'],
    [{ message: 'duplicate storage path family/event/private.jpg', status: 409, code: '23505' }, 'conflict'],
    [{ message: 'rate limit includes password=hunter2', status: 429, code: '429' }, 'rate-limit'],
    [{ message: 'SQLSTATE XX000 detail: family secret picnic message https://host/storage/v1/object/sign/photo.jpg?token=signed-secret', code: 'XX000' }, 'unknown'],
  ];

  for (const [backendError, category] of cases) {
    const safe = serviceErrors.backendServiceError(backendError);
    assert.match(safe.name, new RegExp(`${category}$`));
    assert.doesNotMatch(safe.message, /secret|hunter2|picnic|storage\/v1|private\.jpg|sqlstate|bearer|password|token/i);
    assert.match(safe.message, /try again|sign in again|wait a moment|refresh|don’t have access/i);
  }
});

test('configured transport rejection becomes calm copy while safe validation copy is preserved', async () => {
  const { serviceErrors } = loadCompiledModules();
  const service = serviceErrors.withSafeServiceErrors({
    thread: {
      sendMessage: async () => { throw new TypeError('Failed to fetch'); },
      rejectBackend: async () => { throw { message: 'postgres message body: private family detail', code: 'XX000' }; },
      rejectPlainDetail: async () => { throw new Error('private family message without backend metadata'); },
      validate: async () => { throw serviceErrors.userServiceError('Write a message before sending.'); },
    },
  });

  await assert.rejects(service.thread.sendMessage('event-id', 'draft'), (error) => {
    assert.equal(error.message, 'We couldn’t reach LoopedIn. Check your connection and try again.');
    assert.doesNotMatch(error.message, /failed to fetch/i);
    return true;
  });
  await assert.rejects(service.thread.rejectBackend(), (error) => {
    assert.equal(error.message, 'We couldn’t complete that request. Try again.');
    assert.doesNotMatch(error.message, /postgres|private family detail/i);
    return true;
  });
  await assert.rejects(service.thread.rejectPlainDetail(), (error) => {
    assert.equal(error.message, 'We couldn’t complete that request. Try again.');
    assert.doesNotMatch(error.message, /private family message/i);
    return true;
  });
  await assert.rejects(service.thread.validate(), /Write a message before sending\./);
});

test('privacy-safe telemetry is bounded, deduplicated, and excludes validation errors', async () => {
  const { clientErrorTelemetry, serviceErrors } = loadCompiledModules();
  const sent = [];
  const report = clientErrorTelemetry.createClientErrorTelemetryReporter('loopedin-staging', '0.1.0-123456789abc', async (event) => { sent.push(event); });
  const service = serviceErrors.withSafeServiceErrors({
    auth: {
      transport: async () => { throw new TypeError('Failed to fetch https://private.example?token=secret'); },
      validate: async () => { throw serviceErrors.userServiceError('Enter your email.'); },
    },
    media: { denied: async () => { throw { status: 403, message: 'private media path' }; } },
  }, report);

  await assert.rejects(service.auth.transport());
  await assert.rejects(service.auth.transport());
  await assert.rejects(service.auth.validate());
  await assert.rejects(service.media.denied());
  report({ operation: 'render', category: 'render' });
  report({ operation: 'data', category: 'conflict' });
  report({ operation: 'data', category: 'session' });
  report({ operation: 'data', category: 'access' });
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(sent, [
    { operation: 'auth', category: 'network', release: '0.1.0-123456789abc' },
    { operation: 'media', category: 'access', release: '0.1.0-123456789abc' },
    { operation: 'render', category: 'render', release: '0.1.0-123456789abc' },
    { operation: 'data', category: 'conflict', release: '0.1.0-123456789abc' },
    { operation: 'data', category: 'session', release: '0.1.0-123456789abc' },
  ]);
  assert.doesNotMatch(JSON.stringify(sent), /private|token|secret|email|url|message|stack|user/i);

  const ignored = [];
  const developmentReport = clientErrorTelemetry.createClientErrorTelemetryReporter('development', 'development', async (event) => { ignored.push(event); });
  developmentReport({ operation: 'render', category: 'render' });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(ignored, []);
});

test('telemetry migration stores no caller or content and exposes only an authenticated bounded RPC', () => {
  const migration = fs.readFileSync(path.join(repoRoot, 'supabase', 'migrations', '20260716002122_privacy_safe_error_telemetry.sql'), 'utf8');
  const backupScript = fs.readFileSync(path.join(repoRoot, 'scripts', 'create-hosted-encrypted-backup.ps1'), 'utf8');
  const restoreScript = fs.readFileSync(path.join(repoRoot, 'scripts', 'restore-hosted-encrypted-backup.ps1'), 'utf8');
  const eventTable = migration.match(/create table loopedin_telemetry\.client_error_events \(([\s\S]*?)\n\);/)?.[1] ?? '';
  const appBoundary = read('src/app/AppErrorBoundary.tsx');
  const adapter = read('src/services/supabaseAdapter.ts');

  assert.match(eventTable, /occurred_at timestamptz/);
  assert.match(eventTable, /environment text/);
  assert.match(eventTable, /operation text/);
  assert.match(eventTable, /category text/);
  assert.match(eventTable, /release text/);
  const eventColumns = [...eventTable.matchAll(/^\s*(\w+)\s+(?:timestamptz|text)\b/gm)].map((match) => match[1]);
  assert.deepEqual(eventColumns, ['occurred_at', 'environment', 'operation', 'category', 'release']);
  assert.match(migration, /request_count smallint not null check \(request_count between 1 and 5\)/);
  assert.match(migration, /date_bin\('15 minutes'/);
  assert.match(migration, /interval '24 hours'/);
  assert.match(migration, /interval '30 days'/);
  assert.match(migration, /target_release !~ '\^\[0-9\]\{1,3\}/);
  assert.match(migration, /from loopedin_telemetry\.configuration/);
  assert.doesNotMatch(migration.match(/create or replace function public\.loopedin_report_client_error[\s\S]*?\$\$;/)?.[0] ?? '', /delete from/);
  assert.match(migration, /create index client_error_events_occurred_at_idx/);
  assert.match(migration, /create index client_error_rate_limits_bucket_start_idx/);
  assert.match(migration, /revoke all on schema loopedin_telemetry from public, anon, authenticated/);
  assert.match(migration, /revoke all on function public\.loopedin_report_client_error\(text, text, text\) from public, anon/);
  assert.match(migration, /grant execute on function public\.loopedin_report_client_error\(text, text, text\) to authenticated/);
  assert.match(migration, /grant execute on function public\.loopedin_maintain_client_error_telemetry\(\) to service_role/);
  assert.doesNotMatch(migration, /grant select/);
  assert.doesNotMatch(adapter, /target_environment/);
  assert.match(adapter, /target_release: event\.release/);
  assert.match(appBoundary, /reportRenderErrorTelemetry\(\)/);
  assert.doesNotMatch(appBoundary, /reportRenderErrorTelemetry\([^)]/);
  assert.match(backupScript, /--schema=loopedin_telemetry/);
  assert.match(backupScript, /telemetryConfiguration[\s\S]*?loopedin_telemetry\.configuration/);
  assert.match(backupScript, /--exclude-table-data=loopedin_telemetry\.client_error_events/);
  assert.match(backupScript, /--exclude-table-data=loopedin_telemetry\.client_error_rate_limits/);
  assert.match(backupScript, /client_error_events where occurred_at < now\(\) - interval '30 days'/);
  assert.match(backupScript, /client_error_rate_limits where bucket_start < now\(\) - interval '24 hours'/);
  assert.match(restoreScript, /eventRows[\s\S]*?client_error_events/);
  assert.match(restoreScript, /rateLimitRows[\s\S]*?client_error_rate_limits/);
  assert.match(restoreScript, /Restored telemetry privacy or retention contract mismatch/);
});

test('Supabase retryable auth transport failures retain the network recovery category', () => {
  const { serviceErrors } = loadCompiledModules();
  const retryable = Object.assign(new Error('request failed'), { name: 'AuthRetryableFetchError', status: 0 });
  assert.equal(serviceErrors.sanitizeServiceError(retryable).message, 'We couldn’t reach LoopedIn. Check your connection and try again.');
  const networkError = serviceErrors.sanitizeServiceError(new TypeError('Failed to fetch'));
  assert.equal(serviceErrors.sanitizeServiceError(networkError), networkError, 'sanitizing an already-safe service error is idempotent');
});

test('service reads retry once while writes never retry automatically', () => {
  const provider = read('src/app/AppProviders.tsx');

  assert.match(provider, /queries:\s*\{[\s\S]*?retry: 1/);
  assert.match(provider, /mutations:\s*\{[\s\S]*?retry: false/);
});

test('reminder preference contract is exact-user/event scoped and delivery-honest', () => {
  const api = read('src/services/api.ts');
  const adapter = read('src/services/supabaseAdapter.ts');
  const queries = read('src/app/queries.ts');
  const detail = read('src/screens/EventDetailScreen.tsx');
  const migration = fs.readFileSync(path.join(repoRoot, 'supabase', 'migrations', '20260705214111_loopedin_initial_infra.sql'), 'utf8');

  assert.match(api, /getPreference\(eventId: string\): Promise<ReminderPreference \| null>/);
  assert.match(api, /enablePreference\(eventId: string\): Promise<ReminderPreference>/);
  assert.match(api, /disablePreference\(eventId: string\): Promise<void>/);
  assert.match(adapter, /from\('loopedin_reminder_drafts'\)[\s\S]*?\.eq\('event_id', eventId\)[\s\S]*?\.eq\('user_id', userId\)/);
  assert.match(adapter, /\.upsert\(\{ event_id: eventId, user_id: userId,[\s\S]*?enabled: true \}, \{ onConflict: 'event_id,user_id' \}\)/);
  assert.match(adapter, /from\('loopedin_reminder_drafts'\)\.delete\(\)\.eq\('event_id', eventId\)\.eq\('user_id', userId\)/);
  assert.match(queries, /reminder: \(eventId: string, userId: string\) => \['reminder', eventId, userId\]/);
  assert.match(detail, /setReminder\.variables/);
  assert.match(detail, /Morning of event/);
  assert.match(detail, /This saves an in-app preference for this event\. Push and email delivery are not active\./);
  assert.match(detail, /accessibilityRole="switch"/);
  assert.match(detail, /accessibilityState=\{\{ checked: reminderEnabled, disabled: setReminder\.isPending \}\}/);
  assert.match(detail, /Your choice is ready to retry/);
  assert.match(detail, /minHeight: 48/);
  assert.doesNotMatch(detail, /scheduled|we will remind|you will receive/i);
  assert.match(migration, /create policy "reminders_select_self"[\s\S]*?user_id = \(select auth\.uid\(\)\)[\s\S]*?is_event_member\(event_id\)/);
  assert.match(migration, /create policy "reminders_(insert|update|delete)_self"/);
});

test('local actor sessions isolate family identities while sharing authorized durable records', async () => {
  const { durableAdapter, localActorSession, mockData } = loadCompiledModules();
  const seed = mockData.createMockDatabase();
  const outsider = { id: 'person-outsider', name: 'Outside Person', initials: 'OP', avatarUri: '', role: 'owner' };
  seed.groups.push({ id: 'group-outsider', name: 'Outside Family', description: '', kind: 'family', badge: 'Family', tone: 'sky', memberCount: 1, members: [outsider] });
  seed.events.push({ id: 'event-outsider', groupId: 'group-outsider', creatorId: 'person-outsider', title: 'Private outside plan', startsAt: '2027-01-01T10:00:00Z', endsAt: '2027-01-01T11:00:00Z', location: 'Elsewhere', description: '', statusLabel: 'Plan', visibility: 'group', timeline: [] });
  seed.notifications.push({ id: 'notification-outsider', userId: 'person-outsider', kind: 'event_update', title: 'Outside only', body: 'Private update', eventId: 'event-outsider', groupId: 'group-outsider', read: false, createdAt: '2026-07-12T10:00:00Z' });
  seed.notifications.push({ id: 'notification-second-family-alex', userId: 'person-you', kind: 'event_update', title: 'Wrong family', body: 'Recipient identity alone must not bypass membership', eventId: 'event-outsider', groupId: 'group-outsider', read: false, createdAt: '2026-07-12T10:01:00Z' });

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
  await assert.rejects(outside.notifications.markRead('notification-door-county'), /addressed to you/i);
  await assert.rejects(alex.notifications.markRead('notification-outsider'), /addressed to you/i);
  await alex.notifications.clearAll();
  assert.equal((await maya.notifications.listNotifications())[0].read, false, 'Alex clearing must not change Maya unread state');
  assert.equal((await outside.notifications.listNotifications())[0].read, false, 'clearing Jones updates must preserve the outside group');
  assert.equal(JSON.parse(values.get(durableAdapter.durableDatabaseKey)).database.notifications.find((item) => item.id === 'notification-second-family-alex').read, false, 'recipient without group membership remains inaccessible and unchanged');
  await outside.notifications.clearAll();
  assert.equal((await outside.notifications.listNotifications())[0].read, true);

  assert.equal(await alex.reminders.getPreference('event-door-county'), null);
  assert.equal(await maya.reminders.getPreference('event-door-county'), null);
  const [alexReminder, mayaReminder] = await Promise.all([
    alex.reminders.enablePreference('event-door-county'),
    maya.reminders.enablePreference('event-door-county'),
  ]);
  assert.equal(alexReminder.userId, 'person-you');
  assert.equal(mayaReminder.userId, 'person-maya');
  assert.equal(alexReminder.timing, 'morning_of_event');
  await assert.rejects(outside.reminders.getPreference('event-door-county'), /access/i);
  await assert.rejects(outside.reminders.enablePreference('event-door-county'), /access/i);
  const reloadedAlexReminder = durableAdapter.createDurableLocalLoopedInService(storage, () => seed, alexActor);
  const reloadedMayaReminder = durableAdapter.createDurableLocalLoopedInService(storage, () => seed, mayaActor);
  assert.equal((await reloadedAlexReminder.reminders.getPreference('event-door-county')).userId, 'person-you');
  assert.equal((await reloadedMayaReminder.reminders.getPreference('event-door-county')).userId, 'person-maya');
  await reloadedAlexReminder.reminders.disablePreference('event-door-county');
  await reloadedAlexReminder.reminders.disablePreference('event-door-county');
  assert.equal(await reloadedAlexReminder.reminders.getPreference('event-door-county'), null);
  assert.equal((await reloadedMayaReminder.reminders.getPreference('event-door-county')).userId, 'person-maya', 'one user disabling must not change another user');
  await reloadedMayaReminder.reminders.disablePreference('event-door-county');

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

  actor.setActorId('person-maya');
  const clearPromise = service.notifications.clearAll();
  actor.setActorId('person-noah');
  await clearPromise;
  assert.equal((await service.notifications.listNotifications())[0].read, false, 'Noah stays unread after Maya-started clear');
  actor.setActorId('person-maya');
  assert.equal((await service.notifications.listNotifications())[0].read, true);
});

test('v3 durable messages and events migrate to actor-owned v8 records without changing revision', async () => {
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
  assert.equal(stored.version, 8);
  assert.equal(stored.revision, 19);
  assert.ok(stored.database.events.every((event) => event.creatorId));
});

test('v5 group notification fans out once per recipient in v8 without changing revision', async () => {
  const { durableAdapter, localActorSession, mockData } = loadCompiledModules();
  const legacy = mockData.createMockDatabase();
  legacy.notifications = [{ id: 'notification-legacy-group', kind: 'event_update', title: 'Shared update', body: 'Keep this update', eventId: 'event-door-county', groupId: 'group-jones-family', read: false, createdAt: '2026-07-10T18:00:00Z' }];
  const values = new Map([[durableAdapter.durableDatabaseKey, JSON.stringify({ version: 5, revision: 23, database: legacy })]]);
  const storage = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    removeItem: async (key) => { values.delete(key); },
  };
  const alex = durableAdapter.createDurableLocalLoopedInService(storage, undefined, localActorSession.createMemoryActorSessionStore('person-you'));
  const maya = durableAdapter.createDurableLocalLoopedInService(storage, undefined, localActorSession.createMemoryActorSessionStore('person-maya'));
  assert.deepEqual((await alex.notifications.listNotifications()).map((item) => item.id), ['notification-legacy-group']);
  assert.deepEqual((await maya.notifications.listNotifications()).map((item) => item.id), ['notification-legacy-group:person-maya']);
  const stored = JSON.parse(values.get(durableAdapter.durableDatabaseKey));
  assert.equal(stored.version, 8);
  assert.equal(stored.revision, 23);
  assert.equal(stored.database.notifications.length, 5);
  assert.deepEqual(stored.database.notifications.map((item) => item.userId), ['person-you', 'person-maya', 'person-emma', 'person-noah', 'person-ruth']);
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
  let persisted = JSON.stringify({ version: 8, database: { groups: [{ id: 'group-a', name: 'A', description: '', kind: 'family', badge: 'Family', tone: 'coral', memberCount: 1, members: [{ id: 'person-you', name: 'Alex Jones', initials: 'AJ', avatarUri: '', role: 'owner' }] }], events: [], rsvps: [], activity: [], messages: [], memories: [], media: [], notifications: [], reminders: [], eventOperations: [], messageOperations: [] } });
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
    getItem: async () => JSON.stringify({ version: 9, database: {} }),
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

test('durable local service migrates pre-role v1 members to v8 without losing user data or revision', async () => {
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
  assert.equal(stored.version, 8);
  assert.deepEqual(stored.database.reminders, []);
  assert.equal(stored.database.messages.find((message) => message.id === 'message-legacy-custom').authorId, 'person-you');
  assert.equal(stored.revision, 7);
  assert.equal(writes, 1);

  const reconstructed = durableAdapter.createDurableLocalLoopedInService(storage);
  assert.deepEqual((await reconstructed.groups.listGroupMembers('group-jones-family')).map((member) => member.role), members.map((member) => member.role));
  assert.equal((await reconstructed.events.getEvent('event-legacy-custom')).title, 'Retained custom plan');
  assert.equal(writes, 1, 'a migrated v8 envelope must remain stable on later reconstruction');

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
  assert.equal(envelope.version, 8);
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

test('invitation routes accept only canonical 32-byte base64url tokens and never persist them', () => {
  const { invitationRoute } = loadCompiledModules();
  const token = 'A'.repeat(43);
  assert.equal(invitationRoute.formatInvitationRoute(token), `#/invite/${token}`);
  assert.equal(invitationRoute.parseInvitationToken(`#/invite/${token}`), token);
  assert.equal(invitationRoute.withoutInvitationRoute(`#/invite/${token}`), '#/home');
  for (const finalCharacter of 'AEIMQUYcgkosw048') {
    assert.equal(invitationRoute.isCanonicalInvitationToken(`${'A'.repeat(42)}${finalCharacter}`), true);
  }
  for (const invalid of ['', 'A'.repeat(42), `${'A'.repeat(42)}B`, `${'A'.repeat(43)}?extra=1`, '%E0%A4%A']) {
    assert.equal(invitationRoute.parseInvitationToken(`#/invite/${invalid}`), null);
  }
  assert.equal(invitationRoute.withoutInvitationRoute('#/family'), '#/family');
  assert.notEqual(invitationRoute.invitationFlowId(token), token);
  const source = read('src/features/auth/invitationRoute.ts');
  const adapter = read('src/services/supabaseAdapter.ts');
  assert.doesNotMatch(source, /localStorage|sessionStorage|AsyncStorage/);
  assert.match(adapter, /if \(!isCanonicalInvitationToken\(token\)\)/);
  assert.doesNotMatch(adapter, /\[AQgw\]/);
});

test('invitation preview identifies only a proven wrong-account session for account switching', async () => {
  const { invitationRoute } = loadCompiledModules();
  assert.equal(typeof invitationRoute.resolveInvitationSessionPreview, 'function');
  assert.equal(typeof invitationRoute.shouldOfferInvitationAccountSwitch, 'function');

  const ready = {
    status: 'ready',
    groupId: 'group-invited',
    groupName: 'Invited Family',
    inviterName: 'Family Organizer',
    maskedEmail: 'i***@example.com',
    expiresAt: '2026-09-01T00:00:00Z',
  };
  const checkedEmails = [];
  const correct = await invitationRoute.resolveInvitationSessionPreview(ready, 'invited@example.com', async (email) => {
    checkedEmails.push(email);
    return true;
  }, async () => {
    throw new Error('a matching account must not revalidate the invitation');
  });
  assert.equal(correct.sessionEmailMatchesInvite, true);
  assert.equal(invitationRoute.shouldOfferInvitationAccountSwitch(correct), false);

  let wrongAccountRevalidations = 0;
  const wrong = await invitationRoute.resolveInvitationSessionPreview(ready, 'owner@example.com', async (email) => {
    checkedEmails.push(email);
    return false;
  }, async () => {
    wrongAccountRevalidations += 1;
    return ready;
  });
  assert.equal(wrong.sessionEmailMatchesInvite, false);
  assert.equal(invitationRoute.shouldOfferInvitationAccountSwitch(wrong), true);
  assert.equal(wrongAccountRevalidations, 1);
  assert.deepEqual(checkedEmails, ['invited@example.com', 'owner@example.com']);

  const signedOut = await invitationRoute.resolveInvitationSessionPreview(ready, null, async () => {
    throw new Error('signed-out previews must not check an email');
  }, async () => {
    throw new Error('signed-out previews must not revalidate the invitation');
  });
  assert.equal(signedOut.sessionEmailMatchesInvite, undefined);
  assert.equal(invitationRoute.shouldOfferInvitationAccountSwitch(signedOut), false);

  const terminalDuringMatch = await invitationRoute.resolveInvitationSessionPreview(ready, 'owner@example.com', async () => false, async () => ({ status: 'unavailable' }));
  assert.deepEqual(terminalDuringMatch, { status: 'unavailable' });
  assert.equal(invitationRoute.shouldOfferInvitationAccountSwitch(terminalDuringMatch), false);
});

test('invited signup outcomes distinguish authenticated, duplicate, ambiguous, and unrelated responses', () => {
  const { invitationRoute } = loadCompiledModules();
  assert.equal(typeof invitationRoute.resolveInvitationSignUpOutcome, 'function');

  const session = { access_token: 'ephemeral-session' };
  assert.deepEqual(
    invitationRoute.resolveInvitationSignUpOutcome({ data: { session }, error: null }),
    { status: 'authenticated', session },
  );
  assert.deepEqual(
    invitationRoute.resolveInvitationSignUpOutcome({ data: { session: null }, error: null }),
    { status: 'confirmationOrSignInRequired' },
  );
  assert.deepEqual(
    invitationRoute.resolveInvitationSignUpOutcome({ data: null, error: { code: 'user_already_exists', message: 'opaque provider error' } }),
    { status: 'existingAccount' },
  );
  assert.deepEqual(
    invitationRoute.resolveInvitationSignUpOutcome({ data: null, error: { message: 'User already registered' } }),
    { status: 'existingAccount' },
  );
  assert.deepEqual(
    invitationRoute.resolveInvitationSignUpOutcome({ data: null, error: { code: 'weak_password', message: 'Password is too short' } }),
    { status: 'failed' },
  );
});

test('invite email matching and auth-event profile fallback are deterministic and fail closed', async () => {
  const { invitationRoute } = loadCompiledModules();
  assert.equal(invitationRoute.isReadyInvitationEmailMatch({ ok: true, code: 'ready' }), true);
  for (const result of [null, {}, { ok: false, code: 'ready' }, { ok: true, code: 'unavailable' }]) {
    assert.equal(invitationRoute.isReadyInvitationEmailMatch(result), false);
  }
  assert.equal(await invitationRoute.resolveWithFallback(Promise.resolve('profile session'), 'fallback session'), 'profile session');
  assert.equal(await invitationRoute.resolveWithFallback(Promise.reject(new Error('profile unavailable')), 'fallback session'), 'fallback session');
});

test('invitation drafts normalize email and retain one canonical 32-byte token across retries', () => {
  const { invitationDraft } = loadCompiledModules();
  const firstBytes = Uint8Array.from({ length: 32 }, (_, index) => index);
  const secondBytes = Uint8Array.from({ length: 32 }, (_, index) => 255 - index);
  const first = invitationDraft.invitationDraftForEmail(null, ' Family@Example.COM ', () => firstBytes);
  assert.equal(first.email, 'family@example.com');
  assert.match(first.token, /^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/);
  const retry = invitationDraft.invitationDraftForEmail(first, 'FAMILY@example.com', () => { throw new Error('must not rotate'); });
  assert.equal(retry, first);
  const changed = invitationDraft.invitationDraftForEmail(first, 'other@example.com', () => secondBytes);
  assert.equal(changed.email, 'other@example.com');
  assert.notEqual(changed.token, first.token);
  const confirmed = invitationDraft.confirmInvitationDraft(first, 'https://loopedin.example/');
  assert.equal(confirmed.link, `https://loopedin.example/#/invite/${first.token}`);
  assert.equal(invitationDraft.canSubmitInvitation(confirmed, 'FAMILY@example.com', false), false, 'success blocks an ordinary second submit');
  assert.equal(invitationDraft.retainInvitationPresentation(confirmed), confirmed, 'already_pending preserves the valid displayed link');
  assert.equal(invitationDraft.revokeInvitationPresentation(confirmed, 'family@example.com'), null, 'revoke removes the matching link');
  assert.equal(invitationDraft.revokeInvitationPresentation(confirmed, 'other@example.com'), confirmed, 'unrelated revoke preserves the link');
  assert.throws(() => invitationDraft.encodeInvitationToken(new Uint8Array(31)), /exactly 32 random bytes/);
});

test('configured service maps the accepted family lifecycle RPC contract without direct group writes', () => {
  const api = read('src/services/api.ts');
  const adapter = read('src/services/supabaseAdapter.ts');
  const provider = read('src/features/auth/AuthSessionProvider.tsx');
  const authScreen = read('src/screens/AuthScreen.tsx');
  const queries = read('src/app/queries.ts');

  assert.match(api, /signUp\(invitationToken: string, displayName: string, email: string, password: string\)/);
  assert.match(api, /creationKey: string/);
  for (const rpc of [
    'loopedin_create_group', 'loopedin_can_create_group', 'loopedin_create_group_invite',
    'loopedin_validate_group_invite', 'loopedin_accept_group_invite', 'loopedin_decline_group_invite',
    'loopedin_match_group_invite_email',
    'loopedin_list_group_invites', 'loopedin_revoke_group_invite', 'loopedin_remove_group_member',
    'loopedin_leave_group', 'loopedin_transfer_group_ownership',
  ]) assert.match(adapter, new RegExp(`rpc\\('${rpc}'`));
  assert.match(adapter, /options: \{ data: \{ display_name: name \} \}/);
  const signUpStart = adapter.indexOf('async signUp');
  const matchRpc = adapter.indexOf("rpc('loopedin_match_group_invite_email'", signUpStart);
  assert.ok(matchRpc > signUpStart && matchRpc < adapter.indexOf('supabase.auth.signUp', signUpStart));
  const signUpPreflight = adapter.slice(signUpStart, adapter.indexOf('supabase.auth.signUp', signUpStart));
  assert.equal((signUpPreflight.match(/invitationTokenToHex\(/g) ?? []).length, 1, 'invited signup must convert the canonical token exactly once');
  assert.match(signUpPreflight, /target_token: token, target_email: email\.trim\(\)/);
  const authListener = adapter.slice(adapter.indexOf('onAuthStateChange(listener)'), adapter.indexOf('async refreshSession'));
  assert.match(authListener, /resolveWithFallback\(mapSession\(session\), sessionWithoutProfile\(session\)\)/);
  assert.doesNotMatch(authListener, /catch\([\s\S]*?listener\(null\)/);
  assert.match(adapter, /Email or password not recognized/);
  assert.match(adapter, /We couldn’t create your account\. Try again or ask for a new invitation/);
  const validateInvitation = adapter.slice(adapter.indexOf('async validateInvitation'), adapter.indexOf('async acceptInvitation'));
  assert.equal((validateInvitation.match(/rpc\('loopedin_validate_group_invite'/g) ?? []).length, 2, 'a failed session-email match must revalidate the invitation before offering an account switch');
  assert.match(api, /confirmationOrSignInRequired/);
  assert.match(adapter, /resolveInvitationSignUpOutcome/);
  assert.match(adapter, /If you still need to confirm it, check your inbox and spam folder/);
  assert.match(adapter, /then return to this invitation and sign in/);
  const confirmationGuidance = authScreen.slice(authScreen.indexOf('{auth.confirmationRequired'), authScreen.indexOf('<Pressable', authScreen.indexOf('{auth.confirmationRequired')));
  assert.match(confirmationGuidance, /If a confirmation message arrives, confirm it, then return to this invitation and sign in/);
  assert.match(confirmationGuidance, /If no message arrives, this address may already have an account/);
  assert.match(confirmationGuidance, /Already have an account\? Sign in/);
  assert.doesNotMatch(confirmationGuidance, /we (sent|emailed)|message (has been|was) sent/i);
  assert.doesNotMatch(authScreen, /Check your email to confirm your account, then return to this invitation and sign in/);
  const invitedSignUp = adapter.slice(signUpStart, adapter.indexOf('async requestPasswordReset'));
  assert.doesNotMatch(invitedSignUp, /emailRedirectTo|redirectTo|[?&](invite|token)=/i, 'the private family token must stay in the original hash route, not an Auth redirect or referrer-visible query');
  assert.match(adapter, /target_creation_key: payload\.creationKey/);
  assert.doesNotMatch(adapter.slice(adapter.indexOf('async createGroup'), adapter.indexOf('async updateGroup')), /from\('loopedin_(groups|group_members)'\)\s*\.insert/);
  assert.match(provider, /parseInvitationToken\(window\.location\.hash\)/);
  assert.match(provider, /addEventListener\('hashchange', syncInvitationRoute\)/);
  assert.match(provider, /removeEventListener\('hashchange', syncInvitationRoute\)/);
  assert.match(provider, /signUpWithInvitation/);
  assert.match(provider, /loopedInService\.auth\.signUp\(invitationToken,/);
  assert.match(provider, /clearInvitationToken[\s\S]*?withoutInvitationRoute\(window\.location\.hash\)/);
  assert.doesNotMatch(provider, /useEffect\(\(\) => \{[\s\S]*?withoutInvitationRoute\(window\.location\.hash\)[\s\S]*?\}, \[invitationToken\]\)/);
  assert.match(provider, /groupsQuery\.data\.some\(\(group\) => group\.id === activeGroupId\)/);
  assert.match(queries, /useCreateGroupMutation/);
  assert.match(queries, /useAcceptInvitationMutation/);
  assert.match(queries, /useMarkNotificationReadMutation/);
  assert.match(queries, /useMarkAllNotificationsReadMutation/);
  assert.match(queries, /queryKeys\.notifications/);
  assert.match(queries, /invitationFlowId\(token\)/);
  assert.doesNotMatch(queries, /queryKeys\.invitation\(token\)/);
  assert.match(queries, /evictProtectedQueries\(queryClient\)/);
});

test('active group initialization is persisted-or-empty and transition eviction precedes observation', () => {
  const storage = loadStorageModule();
  const store = read('src/store/useLoopedInStore.ts');
  const provider = read('src/features/auth/AuthSessionProvider.tsx');
  const queries = read('src/app/queries.ts');

  assert.equal(storage.loadActiveGroupId(), '');
  assert.equal(Boolean(storage.loadActiveGroupId()), false, 'empty initialization cannot enable an active-group request');
  const configuredGroupId = '5fe4e9b4-4238-4f3a-bcc1-1dcbd79149f1';
  storage.saveString(storage.storageKeys.activeGroupId, configuredGroupId);
  assert.equal(storage.loadActiveGroupId(), configuredGroupId);
  storage.saveString(storage.storageKeys.activeGroupId, ' invalid/group ');
  assert.equal(storage.loadActiveGroupId(), '');

  assert.match(store, /activeGroupId: loadActiveGroupId\(\)/);
  assert.doesNotMatch(store, /activeGroupId: 'group-jones-family'/);
  assert.match(queries, /enabled: Boolean\(activeGroupId\)/);
  assert.doesNotMatch(provider, /previousActiveGroupId/);
  const transition = provider.slice(provider.indexOf('const nextActiveGroupId'), provider.indexOf('const login'));
  const evictIndex = transition.indexOf('evictProtectedQueries(queryClient)');
  const setIndex = transition.indexOf('setActiveGroupId(nextActiveGroupId)');
  assert.ok(evictIndex >= 0 && evictIndex < setIndex, 'old protected queries are evicted before the new group becomes observable');
  assert.equal(transition.indexOf('evictProtectedQueries(queryClient)', setIndex), -1, 'no post-transition effect can remove newly observed queries');
  const createSuccess = queries.slice(queries.indexOf('export function useCreateGroupMutation'), queries.indexOf('export function useAcceptInvitationMutation'));
  assert.ok(createSuccess.indexOf('evictProtectedQueries(queryClient)') < createSuccess.indexOf('setActiveGroupId(group.id)'));
});

test('latest-resolution guard deterministically rejects stale restore and auth-event results', async () => {
  const { invitationRoute } = loadCompiledModules();
  const guard = invitationRoute.createLatestResolutionGuard();
  let resolveRestore;
  let applied = 'none';
  const restoreIsCurrent = guard.begin();
  const restore = new Promise((resolve) => { resolveRestore = resolve; }).then((value) => {
    if (restoreIsCurrent()) applied = value;
  });
  const eventIsCurrent = guard.begin();
  if (eventIsCurrent()) applied = 'signed-out-event';
  resolveRestore('stale-restored-user');
  await restore;
  assert.equal(applied, 'signed-out-event');

  const slowSignInIsCurrent = guard.begin();
  const signOutIsCurrent = guard.begin();
  if (signOutIsCurrent()) applied = 'signed-out';
  if (slowSignInIsCurrent()) applied = 'stale-sign-in';
  assert.equal(applied, 'signed-out');
});

test('local demo keeps stable family creation retries and honestly declines remote-only capabilities', async () => {
  const { mockAdapter } = loadCompiledModules();
  const service = mockAdapter.createMockLoopedInService();
  await service.auth.chooseLocalProfile('person-you');
  const payload = { creationKey: '11111111-1111-4111-8111-111111111111', name: 'Retry Family', description: '', kind: 'family' };
  const first = await service.groups.createGroup(payload);
  const replay = await service.groups.createGroup(payload);
  assert.equal(replay.id, first.id);
  assert.equal(await service.groups.canCreateGroup(), false);
  assert.deepEqual(await service.groups.validateInvitation('A'.repeat(43)), { status: 'unavailable' });
  await assert.rejects(service.groups.acceptInvitation('A'.repeat(43)), /local family demo/i);
  await assert.rejects(service.auth.signUp('A'.repeat(43), 'New Person', 'new@example.com', 'password'), /local family demo/i);
});

test('Family screen is service-backed with owner and member controls', () => {
  const family = read('src/screens/GroupsScreen.tsx');
  const shell = read('src/navigation/AppShell.tsx');
  assert.match(family, /useActiveGroupQuery/);
  assert.match(family, /useActiveGroupMembersQuery/);
  assert.match(family, /useActiveEventsQuery/);
  assert.match(family, /Loading your family/);
  assert.match(family, /Try again/);
  assert.match(family, /useCreateGroupInvitationMutation/);
  assert.match(family, /crypto\.getRandomValues\(bytes\)/);
  assert.match(family, /new Uint8Array\(32\)/);
  assert.match(family, /Pending invitations/);
  assert.match(family, /invitationDraftForEmail\(inviteDraft\.current, email, randomInvitationBytes\)/);
  assert.match(family, /if \(!canSubmitInvitation\(invitePresentation, email, inviteInFlight\.current\)\) return/);
  assert.match(family, /inviteInFlight\.current = true/);
  assert.match(family, /inviteInFlight\.current = false/);
  assert.match(family, /Retry to safely reuse the same private link/);
  assert.match(family, /already pending for this email\. Revoke it below/);
  assert.match(family, /setInvitePresentation\(confirmInvitationDraft\(draft, base\)\)/);
  assert.match(family, /setInvitePresentation\(\(current\) => retainInvitationPresentation\(current\)\)/);
  assert.match(family, /revokeInvitationPresentation\(invitePresentation, item\.email\)/);
  assert.match(family, /Invitation link created/);
  assert.match(family, /notice\.tone === 'error'/);
  assert.doesNotMatch(family, /notice\.includes/);
  assert.match(family, /Transfer ownership to/);
  assert.match(family, /immediately lose access/);
  assert.match(family, /Leave family/);
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

test('hosted invitation email is a separate explicit, idempotent, delivery-honest action', () => {
  const api = read('src/services/api.ts');
  const adapter = read('src/services/supabaseAdapter.ts');
  const queries = read('src/app/queries.ts');
  const family = read('src/screens/GroupsScreen.tsx');
  assert.match(api, /emailInvitation\?\(invitationId: string, token: string, deliveryKey: string\)/);
  assert.match(adapter, /functions\.invoke\('send-group-invitation',[\s\S]*?body: \{ invitationId, token, deliveryKey \}/);
  assert.match(adapter, /data\?\.status !== 'provider_accepted'/);
  assert.match(adapter, /private link still works/);
  assert.match(queries, /useEmailGroupInvitationMutation/);
  assert.match(queries, /emailInvitation\(invitationId, token, deliveryKey\)/);
  assert.ok(family.indexOf('Create invitation link') < family.indexOf("'Email invitation'"), 'email action must follow link creation');
  assert.match(family, /emailAttempt\.current\?\.invitationId === createdInvitationId[\s\S]*?emailAttempt\.current = attempt/);
  assert.match(family, /auth\.configured && createdInvitationId/);
  assert.match(family, /email provider accepted and queued the invitation/);
  assert.match(family, /private invitation link still works/);
  assert.doesNotMatch(family, /email (?:was )?delivered/i);
});

test('signed-out invitation UI defaults to sign in and reveals accessible account creation only for a ready preview', () => {
  const auth = read('src/screens/AuthScreen.tsx');
  assert.match(auth, /useState<Mode>\('signIn'\)/);
  assert.match(auth, /useInvitationQuery/);
  assert.match(auth, /invitationData\?\.status === 'ready'/);
  assert.match(auth, /Create the invited account/);
  assert.match(auth, /Display name/);
  assert.match(auth, /Confirm password/);
  assert.match(auth, /autoComplete=\{mode === 'signUp' \|\| auth\.recoveryStatus === 'ready' \? 'new-password' : 'current-password'\}/);
  assert.match(auth, /aria-invalid=\{invalid\}/);
  assert.match(auth, /aria-describedby=/);
  assert.match(auth, /nameInput\.current\?\.focus\(\)/);
  assert.match(auth, /emailInput\.current\?\.focus\(\)/);
  assert.match(auth, /maskedEmail/);
  assert.doesNotMatch(auth.slice(0, auth.indexOf("if (!auth.configured)")), /Create invitation/);
});

test('password recovery is enumeration-safe, same-origin, accessible, and provider-event driven', () => {
  const api = read('src/services/api.ts');
  const adapter = read('src/services/supabaseAdapter.ts');
  const client = read('src/services/supabaseClient.ts');
  const provider = read('src/features/auth/AuthSessionProvider.tsx');
  const auth = read('src/screens/AuthScreen.tsx');
  const shell = read('src/navigation/AppShell.tsx');

  assert.match(api, /requestPasswordReset\(email: string, redirectTo: string\): Promise<void>/);
  assert.match(api, /updatePassword\(password: string\): Promise<void>/);
  assert.match(adapter, /resetPasswordForEmail\(email\.trim\(\), \{ redirectTo \}\)/);
  assert.match(adapter, /event === 'PASSWORD_RECOVERY'/);
  assert.match(adapter, /updateUser\(\{ password \}\)/);
  assert.match(client, /detectSessionInUrl: typeof window !== 'undefined'/);
  assert.match(provider, /redirect\.hash = ''/);
  assert.match(client, /hasPasswordRecoveryCallback = callbackFragment\.get\('type'\) === 'recovery'/);
  assert.match(provider, /passwordRecovery\) setRecoveryStatus\('ready'\)/);
  assert.match(provider, /recoveryCallback\.current && !nextSession\) setRecoveryStatus\('invalid'\)/);
  assert.match(provider, /recoveryCallback\.current\) setRecoveryStatus\(nextSession \? 'ready' : 'invalid'\)/);
  assert.match(provider, /if \(recoveryCallback\.current\) \{[\s\S]*?setRecoveryStatus\('invalid'\)/);
  assert.match(shell, /auth\.recoveryStatus !== 'idle'[^\n]*<AuthScreen/);
  assert.match(auth, /Forgot password\?/);
  assert.match(auth, /The same message appears for every address/);
  assert.match(auth, /Use at least 8 characters/);
  assert.match(auth, /Passwords do not match/);
  assert.match(auth, /autoComplete="email"/);
  assert.match(auth, /autoComplete="new-password"/);
  assert.match(auth, /This reset link can’t be used/);
  assert.match(auth, /Return to sign in/);
});

test('authenticated family onboarding handles invite decisions and honest zero-family choices', () => {
  const onboarding = read('src/screens/FamilyOnboardingScreen.tsx');
  const shell = read('src/navigation/AppShell.tsx');
  assert.match(shell, /auth\.invitationToken[\s\S]*?<FamilyOnboardingScreen/);
  assert.match(shell, /auth\.groups\?\.length === 0[\s\S]*?<FamilyOnboardingScreen/);
  assert.doesNotMatch(shell, /title="No groups yet"/);
  assert.match(onboarding, /useAcceptInvitationMutation/);
  assert.match(onboarding, /useDeclineInvitationMutation/);
  assert.match(onboarding, /auth\.clearInvitationToken\(\)/);
  assert.match(onboarding, /useCanCreateGroupQuery/);
  assert.match(onboarding, /entitlement\.data === true/);
  assert.match(onboarding, /entitlement\.data === false/);
  assert.match(onboarding, /Invitation link or code/);
  assert.match(onboarding, /creationKey = useRef\(crypto\.randomUUID\(\)\)/);
  assert.match(onboarding, /creationKey: creationKey\.current/);
  assert.match(onboarding, /catch \{ setMessage\(\{ text: 'This invitation isn’t available/);
  assert.match(onboarding, /setMessage\(\{ text: `You joined/);
  assert.match(onboarding, /await new Promise\(\(resolve\) => setTimeout\(resolve, 1500\)\)[\s\S]*?auth\.clearInvitationToken\(\)/);
  assert.match(onboarding, /shouldOfferInvitationAccountSwitch\(invitation\.data\)/);
  assert.match(onboarding, /shouldOfferInvitationAccountSwitch\(invitation\.data\)[\s\S]*?Sign out to join as the invited person/);
  assert.doesNotMatch(onboarding, /auth\.session \? <>[\s\S]*?Sign out to join as the invited person/);
  assert.doesNotMatch(onboarding, /message\.includes/);
});

test('Home Updates card is compact, truthful, and marks opened or all updates read', () => {
  const home = read('src/screens/HomeScreen.tsx');
  assert.match(home, /useNotificationsQuery/);
  assert.match(home, /useMarkNotificationReadMutation/);
  assert.match(home, /useMarkAllNotificationsReadMutation/);
  assert.match(home, /Loading family updates/);
  assert.match(home, /Updates are unavailable/);
  assert.match(home, /No updates yet/);
  assert.match(home, /\.slice\(0, 3\)/);
  assert.match(home, /!item\.read/);
  assert.match(home, /await markRead\.mutateAsync\(item\.id\)[\s\S]*?onOpenEvent/);
  assert.match(home, /try \{ if \(!item\.read\) await markRead\.mutateAsync\(item\.id\); \} catch[\s\S]*?onOpenEvent/);
  assert.match(home, /Mark all read/);
});

test('new light-surface actions use explicit high-contrast plum controls without secondary Button tone', () => {
  const sources = ['src/screens/AuthScreen.tsx', 'src/screens/FamilyOnboardingScreen.tsx', 'src/screens/GroupsScreen.tsx', 'src/screens/HomeScreen.tsx'].map(read);
  for (const source of sources) {
    assert.doesNotMatch(source, /tone="secondary"/);
    assert.match(source, /backgroundColor: palette\.plum/);
    assert.match(source, /color: palette\.white/);
  }
  const channel = (value) => {
    const linear = value / 255;
    return linear <= 0.04045 ? linear / 12.92 : ((linear + 0.055) / 1.055) ** 2.4;
  };
  const luminance = (hex) => 0.2126 * channel(parseInt(hex.slice(1, 3), 16)) + 0.7152 * channel(parseInt(hex.slice(3, 5), 16)) + 0.0722 * channel(parseInt(hex.slice(5, 7), 16));
  const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
  assert.ok(contrast('#71365D', '#FFFFFF') >= 4.5, 'plum/white text contrast');
  assert.ok(contrast('#71365D', '#FFF9F4') >= 3, 'plum/light-surface boundary contrast');
  assert.ok(contrast('#B33E6D', '#FFF9F4') >= 4.5, 'berry/light-surface error text contrast');
  const readableSources = fs.readdirSync(path.join(appRoot, 'src', 'screens')).filter((name) => name.endsWith('.tsx')).map((name) => read(`src/screens/${name}`));
  for (const source of readableSources) assert.doesNotMatch(source, /color:\s*palette\.(?:coral|sage)/, 'small semantic text must not use low-contrast coral or sage');
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
  assert.match(shell, /fontSize: 12/);
  // Bottom clearance for the fixed nav moved from a shell-level pad to a per-screen inset.
  assert.match(read('src/screens/HomeScreen.tsx'), /paddingBottom: tabBarInset/);
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

test('decorative surfaces stay static while images honor reduced-motion preference', () => {
  const reducedMotion = read('src/components/useReducedMotion.ts');
  const surfaceCard = read('src/components/SurfaceCard.tsx');
  const photoCard = read('src/components/PhotoCard.tsx');
  const avatar = read('src/components/Avatar.tsx');

  assert.match(reducedMotion, /useState\(true\)/, 'first paint must not animate before the preference resolves');
  assert.match(reducedMotion, /AccessibilityInfo\.isReduceMotionEnabled\(\)\.then\(\(enabled\) =>/);
  assert.match(reducedMotion, /if \(mounted\) setReduceMotion\(enabled\)/);
  assert.match(reducedMotion, /addEventListener\('reduceMotionChanged', setReduceMotion\)/);
  assert.match(reducedMotion, /mounted = false/);
  assert.match(reducedMotion, /subscription\.remove\(\)/);
  assert.doesNotMatch(surfaceCard, /MotiView|useReducedMotion|transition|translateY/);
  assert.match(surfaceCard, /return <View style=\{\[styles\.card, style\]\}>\{children\}<\/View>/);
  assert.match(photoCard, /transition=\{reduceMotion \? 0 : 300\}/);
  assert.match(avatar, /transition=\{reduceMotion \? 0 : 220\}/);
});

test('labeled mobile navigation does not load a decorative icon font', () => {
  const shell = read('src/navigation/AppShell.tsx');
  assert.doesNotMatch(shell, /@expo\/vector-icons|Ionicons|tabIcons/);
  assert.match(shell, /minHeight: 58/);
  assert.match(shell, /fontSize: 12/);
});

test('mobile performance gate retains the approved throttling and acceptance budgets', () => {
  const performanceGate = read('../scripts/check-opord12-performance.mjs');
  assert.match(performanceGate, /for \(let run = 1; run <= 3; run \+= 1\)/);
  assert.match(performanceGate, /latency: 400/);
  assert.match(performanceGate, /downloadThroughput: 500 \* 1024 \/ 8/);
  assert.match(performanceGate, /setCPUThrottlingRate', \{ rate: 4 \}/);
  assert.match(performanceGate, /run\.lcpMs > 4000/);
  assert.match(performanceGate, /run\.longestTaskMs > 200/);
  assert.match(performanceGate, /route\.routeMs > 1000/);
  assert.match(performanceGate, /actions\.includes\('Going'\) && actions\.includes\('Maybe'\)/);
  assert.match(performanceGate, /run\.backendRequests\.length/);
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
  const now = new Date();
  const startsAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const endsAt = new Date(startsAt.getTime() + 3 * 60 * 60 * 1000);
  const payload = {
    groupId: 'group-integration',
    title: 'Future lake day',
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    location: 'North shore',
    description: 'Bring towels',
  };

  assert.deepEqual(await service.events.listEvents('group-integration'), []);
  const created = await service.events.createEvent(payload);
  const refetched = await service.events.listEvents('group-integration');
  assert.equal(refetched.length, 1);
  assert.equal(refetched[0].id, created.id);

  const home = selectors.selectHomeViewModel({ events: refetched, now });
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

test('event plan permissions, edits, and cancellation are durable and event-scoped', async () => {
  const { createEvent, durableAdapter, mockData } = loadCompiledModules();
  const seed = mockData.createMockDatabase();
  const alex = seed.groups[0].members.find((member) => member.id === 'person-you');
  const maya = seed.groups[0].members.find((member) => member.id === 'person-maya');
  const noah = seed.groups[0].members.find((member) => member.id === 'person-noah');
  const alexEvent = seed.events.find((event) => event.creatorId === 'person-you');
  const mayaEvent = seed.events.find((event) => event.creatorId === 'person-maya');
  assert.equal(createEvent.canManageEvent(alexEvent, alex), true, 'family owner can manage another creator’s plan');
  assert.equal(createEvent.canManageEvent(alexEvent, maya), false, 'member cannot manage someone else’s plan');
  assert.equal(createEvent.canManageEvent(mayaEvent, maya), true, 'creator can manage their own plan');
  assert.equal(createEvent.canManageEvent(mayaEvent, noah), false);
  const mappedTimeline = createEvent.updateEventLocationTimeline([
    { title: 'Plan', detail: 'Old place · details shared' },
    { title: 'Logistics', detail: 'Old place details are ready' },
    { title: 'Conversation', detail: 'Keep this detail' },
  ], 'New place');
  assert.deepEqual(mappedTimeline.map((item) => item.detail), [
    'New place · details shared with the family',
    'New place · details shared with the family',
    'Keep this detail',
  ]);

  const values = new Map();
  const storage = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    removeItem: async (key) => { values.delete(key); },
  };
  const service = durableAdapter.createDurableLocalLoopedInService(storage);
  const created = await service.events.createEvent({ groupId: 'group-jones-family', title: 'Editable plan', startsAt: '2027-04-02T15:00:00Z', endsAt: '2027-04-02T18:00:00Z', location: 'Old place', description: 'Old notes' });
  await service.rsvps.upsertRsvp({ eventId: created.id, status: 'going' });
  await service.thread.sendMessage(created.id, 'Scoped comment');
  await service.media.uploadMedia({ eventId: created.id, fileUri: 'data:image/png;base64,iVBORw0KGgo=', caption: 'Scoped photo', altText: 'A small test image' });
  const updated = await service.events.updateEvent(created.id, { title: 'Updated family plan', location: 'New place', description: 'Bring lunch' });
  assert.equal(updated.title, 'Updated family plan');
  assert.equal(updated.timeline.find((item) => item.title === 'Logistics').detail.includes('New place'), true);
  assert.equal(updated.timeline.some((item) => item.detail.includes('Old place')), false);
  const reconstructed = durableAdapter.createDurableLocalLoopedInService(storage);
  assert.equal((await reconstructed.events.getEvent(created.id)).location, 'New place');

  await reconstructed.events.deleteEvent(created.id);
  const envelope = JSON.parse(values.get(durableAdapter.durableDatabaseKey));
  assert.equal(envelope.database.events.some((item) => item.id === created.id), false);
  assert.equal(envelope.database.rsvps.some((item) => item.eventId === created.id), false);
  assert.equal(envelope.database.messages.some((item) => item.eventId === created.id), false);
  assert.equal(envelope.database.media.some((item) => item.eventId === created.id), false);
  assert.equal(await durableAdapter.createDurableLocalLoopedInService(storage).events.getEvent(created.id), null);
});

test('unchanged displayed schedule preserves the exact second DST fallback instant', () => {
  const { createEvent, mockData } = loadCompiledModules();
  const previousTimezone = process.env.TZ;
  process.env.TZ = 'America/Chicago';
  try {
    const template = mockData.createMockDatabase().events[0];
    const fallback = { ...template, startsAt: '2026-11-01T01:30:00-06:00', endsAt: '2026-11-01T03:30:00-06:00' };
    const form = createEvent.eventToForm(fallback);
    assert.equal(form.date, '2026-11-01');
    assert.equal(form.time, '01:30');
    const patch = createEvent.buildEventUpdate(fallback, { ...form, title: 'Title-only correction' });
    assert.equal(patch.startsAt, fallback.startsAt);
    assert.equal(patch.endsAt, fallback.endsAt);
  } finally {
    process.env.TZ = previousTimezone;
  }
});

test('Event Detail keeps its 320px hierarchy simple and progressively discloses photo fields', () => {
  const detail = read('src/screens/EventDetailScreen.tsx');
  const queries = read('src/app/queries.ts');
  const shell = read('src/navigation/AppShell.tsx');
  assert.match(detail, /width <= 360 && styles\.heroHeaderNarrow/);
  assert.match(detail, /heroHeaderNarrow: \{ flexDirection: 'column' \}/);
  assert.ok(detail.indexOf('>Thread<') < detail.indexOf('!photoComposerOpen'), 'Thread should appear before the collapsed photo composer');
  assert.match(detail, /!photoComposerOpen/);
  assert.match(detail, /photoMode === 'file'/);
  assert.match(detail, /photoMode === 'link'/);
  assert.match(detail, /Add the photographer and Unsplash photo page/);
  assert.match(detail, /setCreatorName\(''\)/);
  assert.match(detail, /setSourceUrl\(''\)/);
  assert.match(detail, /setTimeout\(\(\) => setPhotoPreviewUri\(uri\), 350\)/);
  assert.match(detail, /return \(\) => clearTimeout\(timeout\)/);
  assert.match(detail, /source=\{\{ uri: photoPreviewUri \}\}/);
  assert.match(detail, /const choosePhoto = \(\) => \{[\s\S]*?setPhotoUri\(''\)[\s\S]*?input\.click\(\)/);
  assert.match(detail, /\.\.\.\(photoMode === 'link' \? \{/);
  assert.match(detail, /Use image file instead/);
  assert.match(detail, /canManageEvent\(eventQuery\.data, currentMember\)/);
  assert.match(detail, /window\.confirm\(`Cancel/);
  assert.match(detail, /setTimeout\(\(\) => editInputRefs\.current\[firstInvalid\]\?\.focus\(\), 0\)/);
  assert.match(detail, /aria-describedby/);
  assert.match(detail, /aria-required/);
  assert.match(detail, /aria-expanded=\{false\}/);
  assert.match(queries, /useUpdateEventMutation/);
  assert.match(queries, /useDeleteEventMutation/);
  assert.match(shell, /fontSize: 12/);
});

test('Supabase event cancellation fails closed for media and zero-row deletes', () => {
  const adapter = read('src/services/supabaseAdapter.ts');
  assert.match(adapter, /from\('loopedin_event_media'\)[\s\S]*?\.eq\('event_id', eventId\)[\s\S]*?\.limit\(1\)/);
  assert.match(adapter, /Remove this event’s photos before canceling the plan/);
  assert.match(adapter, /delete\(\)\.eq\('id', eventId\)\.select\('id'\)/);
  assert.match(adapter, /data\?\.some\(\(row\) => row\.id === eventId\)/);
  assert.match(adapter, /The plan was not deleted/);
});

test('hosted RPC grants keep authenticated operations unavailable to anonymous callers', () => {
  const migration = fs.readFileSync(
    path.join(repoRoot, 'supabase', 'migrations', '20260715123221_restrict_hosted_rpc_execute_grants.sql'),
    'utf8',
  );
  for (const signature of [
    'loopedin_abort_media_upload\\(uuid\\)',
    'loopedin_accept_group_invite\\(text\\)',
    'loopedin_activate_media\\(uuid\\)',
    'loopedin_begin_media_upload\\(uuid, text, text, text, text, text, text, text\\)',
    'loopedin_can_create_group\\(\\)',
    'loopedin_claim_media_deletion\\(uuid\\)',
    'loopedin_create_group\\(text, text, text, uuid\\)',
    'loopedin_create_event\\(uuid, text, timestamptz, timestamptz, text, text, text, text, jsonb, text, uuid\\)',
    'loopedin_create_group_invite\\(uuid, text, text\\)',
    'loopedin_decline_group_invite\\(text\\)',
    'loopedin_finalize_media_deletion\\(uuid\\)',
    'loopedin_leave_group\\(uuid\\)',
    'loopedin_list_group_invites\\(uuid\\)',
    'loopedin_list_media_operations\\(uuid\\)',
    'loopedin_remove_group_member\\(uuid, uuid\\)',
    'loopedin_revoke_group_invite\\(uuid\\)',
    'loopedin_send_event_message\\(uuid, text, uuid\\)',
    'loopedin_transfer_group_ownership\\(uuid, uuid\\)',
  ]) {
    assert.match(migration, new RegExp(`revoke execute on function public\\.${signature} from anon;`));
  }
  assert.doesNotMatch(migration, /loopedin_validate_group_invite[\s\S]*?from anon/);
  assert.doesNotMatch(migration, /loopedin_match_group_invite_email[\s\S]*?from anon/);
});

test('forward media migration persists an active-only, retryable object lifecycle', () => {
  const migrationsDir = path.join(repoRoot, 'supabase', 'migrations');
  const migrations = fs.readdirSync(migrationsDir).sort();
  const migrationName = '20260714090000_loopedin_media_metadata_and_storage_ownership.sql';
  assert.ok(migrations.indexOf(migrationName) > migrations.indexOf('20260705214111_loopedin_initial_infra.sql'));
  const migration = fs.readFileSync(path.join(migrationsDir, migrationName), 'utf8');

  for (const column of ['alt_text', 'source_name', 'source_url', 'creator_name', 'creator_url', 'status']) {
    assert.match(migration, new RegExp(`add column if not exists ${column} text`));
  }
  assert.match(migration, /set alt_text = coalesce\([\s\S]*?caption[\s\S]*?'Shared family photo'\)/);
  assert.match(migration, /alter column caption set default ''[\s\S]*?alter column caption set not null/);
  assert.match(migration, /alter column alt_text set default 'Shared family photo'[\s\S]*?alter column alt_text set not null/);
  assert.match(migration, /foreign key \(event_id\) references public\.loopedin_events\(id\) on delete restrict/);
  assert.match(migration, /loopedin_event_media_alt_text_present[\s\S]*?btrim\(alt_text\) <> ''/);
  assert.match(migration, /loopedin_event_media_attribution_complete/);
  assert.match(migration, /status in \('pending', 'active', 'deleting'\)/);
  assert.match(migration, /revoke insert, update, delete on public\.loopedin_event_media from authenticated/);
  assert.match(migration, /loopedin_begin_media_upload[\s\S]*?'pending'/);
  assert.match(migration, /loopedin_activate_media[\s\S]*?storage\.objects[\s\S]*?set status = 'active'/);
  assert.match(migration, /loopedin_claim_media_deletion[\s\S]*?set status = 'deleting'/);
  assert.match(migration, /loopedin_finalize_media_deletion[\s\S]*?Media object still exists[\s\S]*?delete from public\.loopedin_event_media/);
  assert.match(migration, /loopedin_abort_media_upload[\s\S]*?Media object still exists[\s\S]*?status = 'pending'/);
  assert.match(migration, /loopedin_list_media_operations[\s\S]*?status in \('pending', 'deleting'\)/);
  assert.match(migration, /can_read_media_object[\s\S]*?security definer/);
  assert.match(migration, /can_read_media_object[\s\S]*?storage\.allow_any_operation\(array\[[\s\S]*?'storage\.object\.delete'[\s\S]*?'storage\.object\.delete_many'/);
  assert.match(migration, /can_delete_claimed_media_object[\s\S]*?security definer/);
  assert.match(migration, /array_length\(storage\.foldername\(target_storage_path\), 1\) = 2/);
  assert.match(migration, /count\(\*\)[\s\S]*?status = 'pending'[\s\S]*?>= 3/);
  assert.match(migration, /not loopedin_private\.is_event_member\(current_media\.event_id\)/);
  assert.match(migration, /has_pending_media_object[\s\S]*?pg_advisory_xact_lock[\s\S]*?hashtextextended\(target_storage_path, 0\)/);
  assert.match(migration, /loopedin_abort_media_upload[\s\S]*?pg_advisory_xact_lock[\s\S]*?hashtextextended\(current_media\.storage_path, 0\)/);
  assert.match(migration, /object\.owner_id = current_media\.uploaded_by::text/);
  assert.match(migration, /security definer[\s\S]*?set search_path = ''/);
  assert.match(migration, /revoke all on function public\.loopedin_begin_media_upload[\s\S]*?from public/);

  assert.match(migration, /drop policy if exists "loopedin_media_update_event_members"/);
  assert.match(migration, /drop policy if exists "loopedin_media_update_owner_or_manager"/);
  assert.doesNotMatch(migration, /create policy "loopedin_media_update/);
  assert.match(migration, /drop policy if exists "loopedin_media_delete_event_members"/);
  assert.match(migration, /create policy "loopedin_media_delete_claimed"[\s\S]*?for delete to authenticated/);
  assert.match(migration, /owner_id = \(select auth\.uid\(\)\)::text/);
  assert.match(migration, /loopedin_private\.can_manage_group\(event\.group_id\)/);
  assert.match(migration, /create policy "loopedin_media_insert_pending_owner"[\s\S]*?loopedin_private\.has_pending_media_object\(name\)/);
  assert.match(migration, /create policy "media_select_active_event_member"[\s\S]*?status = 'active'/);
  assert.match(migration, /create policy "loopedin_media_select_active_or_claimed"[\s\S]*?can_read_media_object\(name\)/);
  assert.match(migration, /create policy "loopedin_media_delete_claimed"[\s\S]*?can_delete_claimed_media_object\(name, owner_id\)/);
  assert.match(migration, /update storage\.buckets[\s\S]*?file_size_limit = 1048576[\s\S]*?array\['image\/jpeg', 'image\/png', 'image\/webp'\]/);
});

test('Supabase media contract validates bytes and uses persisted lifecycle RPCs', () => {
  const adapter = read('src/services/supabaseAdapter.ts');
  const mediaColumns = 'id, event_id, storage_path, caption, alt_text, source_name, source_url, creator_name, creator_url, uploaded_by, uploaded_at';

  assert.match(adapter, /caption: row\.caption,[\s\S]*?altText: row\.alt_text/);
  assert.match(adapter, /sourceName: row\.source_name \?\? undefined[\s\S]*?sourceUrl: row\.source_url \?\? undefined[\s\S]*?creatorName: row\.creator_name \?\? undefined[\s\S]*?creatorUrl: row\.creator_url \?\? undefined/);
  assert.ok(adapter.includes(`.select('${mediaColumns}')`), 'list should select the complete media contract');
  assert.doesNotMatch(adapter, /needs the media metadata migration before it can preserve/);

  const beginIndex = adapter.indexOf(".rpc('loopedin_begin_media_upload'");
  const uploadIndex = adapter.indexOf('.upload(storagePath, blob', beginIndex);
  const activateIndex = adapter.indexOf(".rpc('loopedin_activate_media'", uploadIndex);
  assert.ok(beginIndex >= 0 && uploadIndex > beginIndex && activateIndex > uploadIndex);
  assert.match(adapter, /response\.body\?\.getReader[\s\S]*?byteLength > maxBrowserImageBytes[\s\S]*?reader\.cancel/);
  assert.match(adapter, /const jpeg =[\s\S]*?const png =[\s\S]*?const webp =/);
  assert.match(adapter, /createImageBitmap\(blob\)[\s\S]*?image\.width > 0[\s\S]*?image\.close\(\)/);
  assert.match(adapter, /crypto\.randomUUID\(\)/);
  assert.match(adapter, /\.upload\(storagePath, blob, \{ contentType: blob\.type, upsert: false \}\)/);
  assert.match(adapter, /\.eq\('status', 'active'\)/);
  assert.match(adapter, /loopedin_list_media_operations[\s\S]*?status === 'pending'[\s\S]*?loopedin_activate_media[\s\S]*?loopedin_abort_media_upload/);
  assert.match(adapter, /status === 'pending'[\s\S]*?5 \* 60 \* 1000/);

  const deleteStart = adapter.indexOf('async deleteMedia(mediaId)');
  const deleteContract = adapter.slice(deleteStart, adapter.indexOf('\n    notifications:', deleteStart));
  const claimIndex = deleteContract.indexOf(".rpc('loopedin_claim_media_deletion'");
  const removeIndex = deleteContract.indexOf('.remove([claimedMedia.storage_path])');
  const finalizeIndex = deleteContract.indexOf(".rpc('loopedin_finalize_media_deletion'");
  assert.ok(claimIndex >= 0 && removeIndex > claimIndex && finalizeIndex > removeIndex);
  assert.match(deleteContract, /retryable deletion state/);
  assert.match(deleteContract, /cleanup remains retryable/);
});

test('Supabase location updates read and rewrite authoritative Plan and Logistics timeline details', () => {
  const adapter = read('src/services/supabaseAdapter.ts');
  assert.match(adapter, /if \(patch\.location\) \{[\s\S]*?\.select\('timeline'\)[\s\S]*?\.eq\('id', eventId\)[\s\S]*?\.single\(\)/);
  assert.match(adapter, /updateEventLocationTimeline\(getTimeline\(current\?\.timeline\), patch\.location\)/);
  assert.match(adapter, /\.update\(eventPatch\(patch, timeline\)\)/);
});

test('failed durable plan updates and cancellations do not publish partial state', async () => {
  const { durableAdapter } = loadCompiledModules();
  const values = new Map();
  let failWrites = false;
  const storage = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => {
      if (failWrites) throw new Error('simulated plan write failure');
      values.set(key, value);
    },
    removeItem: async (key) => { values.delete(key); },
  };
  const service = durableAdapter.createDurableLocalLoopedInService(storage);
  const before = await service.events.getEvent('event-charleston');
  failWrites = true;
  await assert.rejects(service.events.updateEvent(before.id, { title: 'Must not publish' }), /simulated plan write failure/);
  await assert.rejects(service.events.deleteEvent(before.id), /simulated plan write failure/);
  failWrites = false;
  const reconstructed = durableAdapter.createDurableLocalLoopedInService(storage);
  assert.equal((await reconstructed.events.getEvent(before.id)).title, before.title);
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
  assert.match(detail, /operationKey: messageOperationKey\.current/);
  assert.match(detail, /messageOperationKey\.current = crypto\.randomUUID\(\)/);
  assert.match(detail, /setMessageDraft\(\(current\) => current\.trim\(\) === body \? '' : current\)/);
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

test('Calendar agenda copy can shrink before its status chip at narrow and zoomed widths', () => {
  // Agenda rows now use the shared EventRow, which owns the shrink-before-chip behavior.
  const row = read('src/components/EventRow.tsx');

  assert.match(row, /<View style=\{styles\.copy\}>/);
  assert.match(row, /copy:\s*\{\s*flex: 1,\s*minWidth: 0/);
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

  assert.match(home, /appSections\.upcomingEvents\.slice\(0, visibleUpcomingCount\)/);
  assert.match(home, /visibleUpcomingEvents\.map\(\(event\) =>/);
  assert.match(home, /Show \$\{Math\.min\(12,/);
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

test('representative capacity timing ignores one scheduler outlier but rejects sustained regressions', () => {
  assert.equal(assertRepresentativeTimingBudget([125, 700, 140], 200, 'selectors'), 140);
  assert.throws(
    () => assertRepresentativeTimingBudget([225, 700, 240], 200, 'selectors'),
    /selectors median 240\.0ms exceeded 200ms/,
  );
});

test('representative family capacity preserves exact event identity and stays within local processing budgets', async (t) => {
  const { durableAdapter, mockAdapter, mockData, selectors } = loadCompiledModules();
  const database = mockData.createMockDatabase();
  const group = database.groups[0];
  const memberTemplate = group.members[0];
  group.members = Array.from({ length: 20 }, (_, index) => ({
    ...memberTemplate,
    id: index === 0 ? 'person-you' : `person-capacity-${index}`,
    name: index === 0 ? 'Alex Jones' : `Capacity Member ${index}`,
    initials: index === 0 ? 'AJ' : `C${index}`,
    role: index === 0 ? 'owner' : 'member',
  }));
  group.memberCount = group.members.length;

  const eventTemplate = database.events[0];
  database.events = Array.from({ length: 100 }, (_, index) => ({
    ...eventTemplate,
    id: `event-capacity-${String(index).padStart(3, '0')}`,
    title: `Capacity plan ${index + 1}`,
    startsAt: new Date(Date.UTC(2027, 0, 1 + index, 15)).toISOString(),
    endsAt: new Date(Date.UTC(2027, 0, 1 + index, 17)).toISOString(),
  }));
  const targetEventId = database.events[0].id;
  database.messages = Array.from({ length: 100 }, (_, index) => ({
    id: `message-capacity-${String(index).padStart(3, '0')}`,
    eventId: targetEventId,
    body: `Capacity comment ${index + 1}`,
    authorId: group.members[index % group.members.length].id,
    authorName: group.members[index % group.members.length].name,
    author: group.members[index % group.members.length],
    self: index % group.members.length === 0,
    createdAt: new Date(Date.UTC(2026, 6, 14, 12, index)).toISOString(),
  }));
  database.media = Array.from({ length: 50 }, (_, index) => ({
    ...database.media[0],
    id: `media-capacity-${String(index).padStart(2, '0')}`,
    eventId: targetEventId,
    caption: `Capacity photo ${index + 1}`,
    uploadedAt: new Date(Date.UTC(2026, 6, 14, 14, index)).toISOString(),
  }));
  database.rsvps = group.members.map((member) => ({
    eventId: targetEventId,
    personId: member.id,
    personName: member.name,
    status: 'going',
  }));

  const service = mockAdapter.createMockLoopedInService(database);
  const serviceSamples = [];
  let members;
  let events;
  let messages;
  let media;
  for (let sample = 0; sample < 3; sample += 1) {
    const startedAt = performance.now();
    [members, events, messages, media] = await Promise.all([
      service.groups.listGroupMembers(group.id),
      service.events.listEvents(group.id),
      service.thread.listMessages(targetEventId),
      service.media.listMedia(targetEventId),
    ]);
    serviceSamples.push(performance.now() - startedAt);
  }
  const serviceElapsedMs = assertRepresentativeTimingBudget(serviceSamples, 250, 'parallel local reads');
  const selectorSamples = [];
  let home;
  let detail;
  for (let sample = 0; sample < 3; sample += 1) {
    const startedAt = performance.now();
    home = selectors.selectHomeViewModel({ events, now: new Date('2026-07-14T00:00:00Z') });
    detail = selectors.selectEventDetailViewModel(events[0], database.rsvps, messages);
    selectorSamples.push(performance.now() - startedAt);
  }
  const selectorElapsedMs = assertRepresentativeTimingBudget(selectorSamples, 200, 'selectors');

  assert.equal(members.length, 20);
  assert.equal(events.length, 100);
  assert.equal(messages.length, 100);
  assert.equal(media.length, 50);
  assert.equal(events[0].id, targetEventId);
  assert.equal(home.heroEvent.id, targetEventId);
  assert.equal(home.upcomingEvents.length, 99);
  assert.equal(detail.id, targetEventId);
  assert.equal(detail.rsvpSummary, '20 going');

  const values = new Map();
  const storage = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    removeItem: async (key) => { values.delete(key); },
  };
  const durableStartedAt = performance.now();
  const durable = durableAdapter.createDurableLocalLoopedInService(storage, () => database);
  assert.equal((await durable.events.listEvents(group.id)).length, 100);
  const reconstructed = durableAdapter.createDurableLocalLoopedInService(storage, () => mockData.createEmptyMockDatabase());
  assert.equal((await reconstructed.groups.listGroupMembers(group.id)).length, 20);
  assert.equal((await reconstructed.thread.listMessages(targetEventId)).length, 100);
  assert.equal((await reconstructed.media.listMedia(targetEventId)).length, 50);
  const durableElapsedMs = performance.now() - durableStartedAt;

  t.diagnostic(`representative volume: 20 members, 100 events, 100 comments, 50 media; parallel reads median ${serviceElapsedMs.toFixed(1)}ms [${serviceSamples.map((sample) => sample.toFixed(1)).join(', ')}]; selectors median ${selectorElapsedMs.toFixed(1)}ms [${selectorSamples.map((sample) => sample.toFixed(1)).join(', ')}]; durable reconstruction ${durableElapsedMs.toFixed(1)}ms`);
});

test('event message subscription is exact-key, reconnecting, and inert after cleanup', async () => {
  const { messageSubscription } = loadCompiledModules();
  const records = { name: '', filter: null, change: null, system: null, status: null, removed: [] };
  const channel = {
    on(type, filter, callback) {
      if (type === 'postgres_changes') {
        records.filter = filter;
        records.change = callback;
      } else {
        assert.equal(type, 'system');
        assert.deepEqual(filter, {});
        records.system = callback;
      }
      return this;
    },
    subscribe(callback) {
      records.status = callback;
      return this;
    },
  };
  const client = {
    channel(name) {
      records.name = name;
      return channel;
    },
    async removeChannel(removed) {
      records.removed.push(removed);
    },
  };
  let changes = 0;
  const statuses = [];
  const unsubscribe = messageSubscription.subscribeToEventMessages(
    client,
    'event-a',
    () => { changes += 1; },
    (status) => statuses.push(status),
  );

  assert.equal(records.name, 'event-messages:event-a');
  assert.deepEqual(records.filter, {
    event: '*',
    schema: 'public',
    table: 'loopedin_event_messages',
    filter: 'event_id=eq.event-a',
  });
  records.status('SUBSCRIBED');
  assert.equal(changes, 0, 'channel join alone is not Postgres readiness');
  records.system({ extension: 'system', status: 'ok' });
  assert.equal(changes, 0, 'unrelated system readiness is ignored');
  records.system({ extension: 'postgres_changes', status: 'error' });
  records.system({ extension: 'postgres_changes', status: 'ok' });
  assert.equal(changes, 1, 'Postgres readiness reconciles server history');
  records.change();
  assert.equal(changes, 2, 'one matching database event requests one reconciliation');
  records.status('CHANNEL_ERROR');
  records.status('TIMED_OUT');
  records.status('CLOSED');
  records.status('SUBSCRIBED');
  assert.equal(changes, 2, 'channel rejoin still waits for Postgres readiness');
  records.system({ extension: 'postgres_changes', status: 'ok' });
  assert.equal(changes, 3, 'Postgres reconnect reconciles missed server history once');
  assert.deepEqual(statuses, [
    'reconnecting', 'reconnecting', 'connected', 'reconnecting',
    'reconnecting', 'reconnecting', 'reconnecting', 'connected',
  ]);

  unsubscribe();
  unsubscribe();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(records.removed, [channel], 'cleanup removes the channel once');
  records.change();
  records.status('SUBSCRIBED');
  records.system({ extension: 'postgres_changes', status: 'ok' });
  assert.equal(changes, 3, 'late callbacks cannot update an unmounted or switched event');
  assert.equal(statuses.length, 8);
});

test('message reconciliation replaces a stale initial fetch after Postgres readiness', async () => {
  const { queryReconciliation } = loadCompiledModules();
  const appRequire = createRequire(path.join(appRoot, 'package.json'));
  const { QueryClient, QueryObserver } = appRequire('@tanstack/query-core');
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const queryKey = ['messages', 'event-a'];
  let calls = 0;
  let resolveInitial;
  const observer = new QueryObserver(queryClient, {
    queryKey,
    queryFn: async () => {
      calls += 1;
      if (calls === 1) return new Promise((resolve) => { resolveInitial = resolve; });
      return ['fresh'];
    },
  });
  const unsubscribe = observer.subscribe(() => undefined);

  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls, 1);
  await queryReconciliation.refetchActiveQueryAfterInFlight(queryClient, queryKey);
  assert.equal(calls, 2, 'readiness starts a fresh exact query after cancelling the stale initial fetch');
  resolveInitial(['stale']);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(queryClient.getQueryData(queryKey), ['fresh']);

  unsubscribe();
  queryClient.clear();
});

test('lifecycle status failure eviction removes populated protected caches only', () => {
  const { protectedQueries } = loadCompiledModules();
  const appRequire = createRequire(path.join(appRoot, 'package.json'));
  const { QueryClient } = appRequire('@tanstack/query-core');
  const queryClient = new QueryClient();
  const protectedKeys = [
    ['groups'], ['event', 'event-a'], ['events', 'group-a'], ['rsvps', 'event-a'],
    ['messages', 'event-a'], ['media', 'event-a'], ['notifications'], ['reminder', 'event-a', 'user-a'],
    ['profiles'], ['invitation', 'current-preview', 'flow-a'],
  ];
  for (const key of protectedKeys) queryClient.setQueryData(key, { private: true });
  queryClient.setQueryData(['account-deletion-status'], { safe: true });

  protectedQueries.evictProtectedQueries(queryClient);

  for (const key of protectedKeys) assert.equal(queryClient.getQueryData(key), undefined, `${key[0]} cache survived lifecycle status failure`);
  assert.deepEqual(queryClient.getQueryData(['account-deletion-status']), { safe: true });
  queryClient.clear();
});

test('hosted family harness is exact-project, staging-acknowledged, synthetic, and cleanup-bounded', () => {
  const harness = fs.readFileSync(path.join(repoRoot, 'tests/supabase-hosted-family-e2e.mjs'), 'utf8');
  const wrapper = fs.readFileSync(path.join(repoRoot, 'scripts/test-hosted-supabase-family.ps1'), 'utf8');

  for (const source of [harness, wrapper]) {
    assert.match(source, /vkogznsfthirhxkqysza/);
    assert.match(source, /lzscofbvecgpchokxhyb/);
    assert.match(source, /AcknowledgeStagingOnly|I_ACKNOWLEDGE_LOOPEDIN_STAGING_ONLY/);
    assert.doesNotMatch(source, /travisjohn\.jones@gmail\.com|Jones Fam/);
  }
  assert.match(wrapper, /& supabase projects api-keys --project-ref \$projectRef --reveal --output json/);
  assert.doesNotMatch(wrapper, /\bnpx\b/);
  assert.match(wrapper, /SUPABASE_PUBLISHABLE_KEY/);
  assert.match(wrapper, /SUPABASE_SECRET_KEY/);
  assert.match(harness, /@loopedin\.invalid/);
  assert.match(harness, /randomPassword/);
  assert.match(harness, /loopedin_create_group/);
  assert.match(harness, /loopedin_match_group_invite_email/);
  assert.match(harness, /loopedin_accept_group_invite/);
  assert.match(harness, /loopedin_begin_media_upload/);
  assert.match(harness, /postgres_changes/);
  assert.match(harness, /\.on\('system'/);
  assert.match(harness, /payload\.extension === 'postgres_changes'/);
  assert.doesNotMatch(harness, /setTimeout\(resolve, 2000\)/);
  assert.match(harness, /protectedFingerprint/);
  assert.match(harness, /protectedStateUnchanged: true/);
  assert.match(harness, /finally/);
  assert.match(harness, /nonzero residue/);
});

test('hosted family evidence redacts credentials and emits only bounded handoff/result fields', () => {
  const harness = fs.readFileSync(path.join(repoRoot, 'tests/supabase-hosted-family-e2e.mjs'), 'utf8');
  const wrapper = fs.readFileSync(path.join(repoRoot, 'scripts/test-hosted-supabase-family.ps1'), 'utf8');

  assert.match(harness, /\[REDACTED_KEY\]/);
  assert.match(harness, /\[REDACTED_TOKEN\]/);
  assert.match(harness, /\[REDACTED_EMAIL\]/);
  assert.match(harness, /sensitiveValues/);
  assert.match(harness, /\\b\[0-9a-f\]\{64\}\\b/);
  assert.match(harness, /outsider invitation acceptance/);
  assert.match(harness, /group marker mismatch/);
  assert.match(harness, /remainingProfiles/);
  assert.match(harness, /remainingInvitations/);
  assert.doesNotMatch(harness, /assert\.deepEqual\([^\n]*(?:match|invite|accept)/i);
  assert.match(harness, /console\.log\(JSON\.stringify\(\{/);
  assert.doesNotMatch(harness, /console\.(?:log|error)\([^\n]*(?:password|access_token|secretKey|publishableKey)/i);
  assert.match(wrapper, /2>\$null/);
  assert.match(wrapper, /\$rawKeys = \$null/);
  assert.match(wrapper, /\$publishableValue = \$null/);
  assert.match(wrapper, /\$secretValue = \$null/);
});

test('real owner starter seed is exact-project, explicitly acknowledged, idempotent, and attribution-preserving', () => {
  const seed = fs.readFileSync(path.join(repoRoot, 'scripts/seed-hosted-owner-starter.mjs'), 'utf8');
  const wrapper = fs.readFileSync(path.join(repoRoot, 'scripts/seed-hosted-owner-starter.ps1'), 'utf8');

  for (const source of [seed, wrapper]) {
    assert.match(source, /vkogznsfthirhxkqysza/);
    assert.match(source, /lzscofbvecgpchokxhyb/);
    assert.match(source, /AcknowledgeRealOwnerData|I_ACKNOWLEDGE_LOOPEDIN_REAL_OWNER_STARTER_DATA/);
    assert.doesNotMatch(source, /travisjohn\.jones@gmail\.com|Jones Fam/);
  }
  assert.match(seed, /admin\/generate_link/);
  assert.match(seed, /type: 'magiclink'/);
  assert.match(seed, /token_hash: tokenHash/);
  assert.match(seed, /target_operation_key: definition\.operationKey/);
  assert.match(seed, /target_operation_key: definition\.commentKey/);
  assert.match(seed, /expected exactly one approved owner identity/);
  assert.match(seed, /family membership baseline changed/);
  assert.match(seed, /validation event marker mismatch/);
  assert.match(seed, /images\.unsplash\.com/);
  assert.match(seed, /sourceUrl: 'https:\/\/unsplash\.com\/photos\//);
  assert.match(seed, /loopedin_begin_media_upload/);
  assert.match(seed, /loopedin_activate_media/);
  assert.match(seed, /loopedin_abort_media_upload/);
  assert.match(seed, /row\.status === 'active'/);
  assert.match(seed, /validation event RSVP marker mismatch/);
  assert.match(seed, /check validation reminders/);
  assert.match(seed, /check validation notifications/);
});

test('real owner starter seed redacts ephemeral auth and clears provider keys', () => {
  const seed = fs.readFileSync(path.join(repoRoot, 'scripts/seed-hosted-owner-starter.mjs'), 'utf8');
  const wrapper = fs.readFileSync(path.join(repoRoot, 'scripts/seed-hosted-owner-starter.ps1'), 'utf8');

  assert.match(seed, /sensitiveValues\.add\(tokenHash\)/);
  assert.match(seed, /sensitiveValues\.add\(verified\.access_token\)/);
  assert.match(seed, /\[REDACTED_TOKEN\]/);
  assert.match(seed, /\[REDACTED_EMAIL\]/);
  assert.match(seed, /\[REDACTED_KEY\]/);
  assert.doesNotMatch(seed, /console\.(?:log|error)\([^\n]*(?:access_token|refresh_token|tokenHash|secretKey|publishableKey)/i);
  assert.match(wrapper, /2>\$null/);
  assert.match(wrapper, /\$rawKeys = \$null/);
  assert.match(wrapper, /\$publishableValue = \$null/);
  assert.match(wrapper, /\$secretValue = \$null/);
});

test('hosted availability monitor is no-secret, exact-target, and privacy-safe', () => {
  const monitor = fs.readFileSync(path.join(repoRoot, 'scripts/check-hosted-availability.mjs'), 'utf8');
  const workflow = fs.readFileSync(path.join(repoRoot, '.github/workflows/availability.yml'), 'utf8');

  assert.match(monitor, /https:\/\/loopedin-family\.netlify\.app/);
  assert.match(monitor, /vkogznsfthirhxkqysza/);
  assert.match(monitor, /runtime-config\.json/);
  assert.match(monitor, /auth\/v1\/health/);
  assert.match(monitor, /missing static asset no longer returns 404/);
  assert.doesNotMatch(monitor, /SUPABASE_SECRET|service_role|authorization/i);
  assert.doesNotMatch(workflow, /secrets\.|pull_request|push:/);
  assert.match(workflow, /permissions:\r?\n  contents: read/);
  assert.doesNotMatch(workflow, /schedule:/);
  assert.match(workflow, /workflow_dispatch:/);
  const combined = fs.readFileSync(path.join(repoRoot, '.github/workflows/telemetry-operations.yml'), 'utf8');
  assert.match(combined, /cron: '11 \* \* \* \*'/);
  assert.match(combined, /if: \$\{\{ !cancelled\(\) \}\}\r?\n        run: node scripts\/check-hosted-availability\.mjs/);
  assert.match(workflow, /node scripts\/check-hosted-availability\.mjs/);
});

test('hosted backup packages protected schemas and private bytes under client encryption', () => {
  const backup = fs.readFileSync(path.join(repoRoot, 'scripts/create-hosted-encrypted-backup.ps1'), 'utf8');
  const restore = fs.readFileSync(path.join(repoRoot, 'scripts/restore-hosted-encrypted-backup.ps1'), 'utf8');
  const workflow = fs.readFileSync(path.join(repoRoot, '.github/workflows/encrypted-backup.yml'), 'utf8');

  for (const source of [backup, restore]) assert.match(source, /vkogznsfthirhxkqysza/);
  assert.match(backup, /lzscofbvecgpchokxhyb/);
  for (const schema of ['public', 'loopedin_private', 'auth', 'storage']) assert.match(backup, new RegExp(`--schema=${schema}`));
  assert.match(backup, /storage\/v1\/object\/authenticated/);
  assert.match(backup, /local-backup-crypto\.mjs'\) encrypt/);
  assert.match(backup, /Get-FileHash -Algorithm SHA256/);
  assert.match(backup, /-Filter '\*\.sql'/);
  assert.match(backup, /postgres@sha256:178f0976/);
  assert.match(backup, /fingerprintBefore/);
  assert.match(backup, /loopedin_event_create_operations t\)/);
  assert.match(backup, /json_agg\(t order by actor_id,group_id,operation_key\)/);
  assert.match(backup, /loopedin_message_create_operations t\)/);
  assert.match(backup, /json_agg\(t order by actor_id,event_id,operation_key\)/);
  assert.doesNotMatch(backup, /json_agg\(t order by user_id,operation_key\)/);
  assert.match(backup, /supabase_migrations/);
  assert.match(restore, /local-backup-crypto\.mjs'\) decrypt/);
  assert.match(restore, /disposable Docker database; primary was never a restore target/);
  assert.match(restore, /--network none/);
  assert.match(restore, /Backup image identity mismatch/);
  assert.match(restore, /Restored migration history mismatch/);
  assert.match(restore, /Restored member RLS scope mismatch/);
  assert.match(restore, /mediaWithoutObject/);
  assert.match(restore, /outsiderEvents/);
  assert.match(workflow, /cron: '23 5 \* \* \*'/);
  assert.match(workflow, /retention-days: 30/);
  assert.match(workflow, /environment: loopedin-staging-backup/);
  assert.ok(workflow.indexOf('Verify isolated database restore before upload') < workflow.indexOf('Upload encrypted backup only'));
  assert.doesNotMatch(workflow, /pull_request|push:/);
  assert.doesNotMatch(backup, /console\.|Write-Host|service_role/);
  assert.doesNotMatch(restore, /console\.|Write-Host/);
});
