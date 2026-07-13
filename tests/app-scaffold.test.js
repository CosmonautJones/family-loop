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

function loadCompiledSelectors() {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'loopedin-selectors-'));
  const tsc = path.join(appRoot, 'node_modules', 'typescript', 'bin', 'tsc');
  execFileSync(process.execPath, [tsc,
    path.join(appRoot, 'src/app/selectors.ts'),
    '--outDir', outDir,
    '--module', 'commonjs',
    '--target', 'es2020',
    '--esModuleInterop',
    '--skipLibCheck',
  ]);
  const require = createRequire(path.join(outDir, 'selector-test.cjs'));
  return require(path.join(outDir, 'app/selectors.js'));
}

test('mobile scaffold files exist', () => {
  for (const rel of [
    'package.json',
    'app.json',
    'tsconfig.json',
    'App.tsx',
    'index.ts',
    'README.md',
    'src/theme/tokens.ts',
    'src/components/Chip.tsx',
    'src/components/Button.tsx',
    'src/components/SurfaceCard.tsx',
    'src/components/AppBackground.tsx',
    'src/components/Avatar.tsx',
    'src/components/PhotoCard.tsx',
    'src/types/domain.ts',
    'src/types/ui.ts',
    'src/lib/date.ts',
    'src/lib/storage.ts',
    'src/app/selectors.ts',
    'src/app/AppProviders.tsx',
    'src/app/queries.ts',
    'src/features/auth/AuthSessionProvider.tsx',
    'src/store/useLoopedInStore.ts',
    'src/services/api.ts',
    'src/services/index.ts',
    'src/services/mockAdapter.ts',
    'src/services/mockData.ts',
    'src/services/supabaseAdapter.ts',
    'src/services/supabaseClient.ts',
    'src/features/home/fixtures.ts',
    'src/features/calendar/fixtures.ts',
    'src/features/groups/fixtures.ts',
    'src/features/memories/fixtures.ts',
    'src/features/events/fixtures.ts',
    'src/features/events/selectors.ts',
    'src/features/events/createEvent.ts',
    'src/features/events/eventData.ts',
    'src/features/events/index.ts',
    'src/screens/HomeScreen.tsx',
    'src/screens/CalendarScreen.tsx',
    'src/screens/EventDetailScreen.tsx',
    'src/screens/CreateEventScreen.tsx',
    'src/screens/MemoriesScreen.tsx',
    'src/screens/GroupsScreen.tsx',
    'src/navigation/AppShell.tsx',
    'src/navigation/useAppShellState.ts',
  ]) {
    assert.equal(fs.existsSync(path.join(appRoot, rel)), true, `${rel} should exist`);
  }

  assert.equal(fs.existsSync(path.join(appRoot, 'src/data/sampleData.ts')), false, 'legacy sample data module should be removed');
});

test('App entry composes the navigation shell', () => {
  const content = read('App.tsx');
  assert.match(content, /AppShell/);
  assert.doesNotMatch(content, /Lake Picnic with Family/);
});

test('domain models, fixtures, selectors, and screens use feature-oriented modules', () => {
  const domain = read('src/types/domain.ts');
  const ui = read('src/types/ui.ts');
  const dateLib = read('src/lib/date.ts');
  const storageLib = read('src/lib/storage.ts');
  const appSelectors = read('src/app/selectors.ts');
  const appProviders = read('src/app/AppProviders.tsx');
  const appQueries = read('src/app/queries.ts');
  const authProvider = read('src/features/auth/AuthSessionProvider.tsx');
  const appStore = read('src/store/useLoopedInStore.ts');
  const serviceApi = read('src/services/api.ts');
  const serviceIndex = read('src/services/index.ts');
  const mockAdapter = read('src/services/mockAdapter.ts');
  const mockData = read('src/services/mockData.ts');
  const supabaseAdapter = read('src/services/supabaseAdapter.ts');
  const supabaseClient = read('src/services/supabaseClient.ts');
  const homeFixtures = read('src/features/home/fixtures.ts');
  const calendarFixtures = read('src/features/calendar/fixtures.ts');
  const groupFixtures = read('src/features/groups/fixtures.ts');
  const memoryFixtures = read('src/features/memories/fixtures.ts');
  const eventFixtures = read('src/features/events/fixtures.ts');
  const eventSelectors = read('src/features/events/selectors.ts');
  const createEvent = read('src/features/events/createEvent.ts');
  const eventData = read('src/features/events/eventData.ts');
  const eventFeatureIndex = read('src/features/events/index.ts');
  const appBackground = read('src/components/AppBackground.tsx');
  const avatar = read('src/components/Avatar.tsx');
  const photoCard = read('src/components/PhotoCard.tsx');
  const homeScreen = read('src/screens/HomeScreen.tsx');
  const calendarScreen = read('src/screens/CalendarScreen.tsx');
  const eventScreen = read('src/screens/EventDetailScreen.tsx');
  const createEventScreen = read('src/screens/CreateEventScreen.tsx');
  const memoriesScreen = read('src/screens/MemoriesScreen.tsx');
  const groupsScreen = read('src/screens/GroupsScreen.tsx');
  const shell = read('src/navigation/AppShell.tsx');
  const shellState = read('src/navigation/useAppShellState.ts');

  assert.match(domain, /export type Group/);
  assert.match(domain, /export type Event/);
  assert.match(domain, /export type RSVP/);
  assert.match(domain, /export type EventActivity/);
  assert.match(domain, /export type MemoryItem/);
  assert.match(domain, /export type Person/);
  assert.match(domain, /export type MediaItem/);
  assert.match(ui, /export type AccentTone/);
  assert.match(dateLib, /formatEventDateRange/);
  assert.match(storageLib, /saveDraftEvent/);
  assert.match(appSelectors, /selectHomeViewModel/);
  assert.match(appSelectors, /selectCalendarViewModel/);
  assert.match(appSelectors, /selectGroupsViewModel/);
  assert.match(appSelectors, /selectMemoriesViewModel/);
  assert.match(appSelectors, /selectEventDetailViewModel/);
  assert.match(appProviders, /QueryClientProvider/);
  assert.match(appQueries, /useActiveEventsQuery/);
  assert.match(appQueries, /useGroupsQuery/);
  assert.match(authProvider, /'restoring' \| 'signedOut' \| 'authenticated' \| 'error'/);
  assert.match(authProvider, /queryClient\.clear\(\)/);
  assert.match(authProvider, /groupsQuery\.data\[0\]\?\.id \?\? ''/);
  assert.doesNotMatch(authProvider, /refreshSession\(/);
  assert.match(appStore, /useLoopedInStore/);
  assert.match(appStore, /setRsvpStatus/);
  assert.match(appStore, /stageEventPhoto/);
  assert.match(appStore, /toggleReminderDraft/);
  assert.match(serviceApi, /export interface LoopedInService/);
  assert.match(serviceApi, /getSession\(\): Promise<AuthSession \| null>/);
  assert.match(serviceApi, /onAuthStateChange/);
  assert.match(serviceIndex, /hasSupabaseConfig/);
  assert.match(serviceIndex, /createSupabaseLoopedInService/);
  assert.match(serviceIndex, /isServiceConfigured/);
  assert.match(mockAdapter, /createMockLoopedInService/);
  assert.match(mockData, /createMockDatabase/);
  assert.match(supabaseAdapter, /createSupabaseLoopedInService/);
  assert.match(supabaseAdapter, /auth\.getSession\(\)/);
  assert.match(supabaseAdapter, /auth\.onAuthStateChange/);
  assert.match(supabaseAdapter, /loopedin_groups/);
  assert.match(supabaseClient, /EXPO_PUBLIC_SUPABASE_URL/);
  assert.match(supabaseClient, /EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.match(homeFixtures, /heroEvent/);
  assert.match(calendarFixtures, /calendarEvents/);
  assert.match(groupFixtures, /groupsOverview/);
  assert.match(memoryFixtures, /memoriesRecap/);
  assert.match(eventFixtures, /eventDetail/);
  assert.match(eventFixtures, /eventThread/);
  assert.match(eventSelectors, /selectEventRsvpSummary/);
  assert.match(eventSelectors, /selectEventTimeline/);
  assert.match(createEvent, /buildCreateEventFields/);
  assert.match(createEvent, /summarizeDraftEvent/);
  assert.match(eventData, /draftEventTemplate/);
  assert.match(eventFeatureIndex, /export \*/);
  assert.match(appBackground, /LinearGradient/);
  assert.match(avatar, /expo-image/);
  assert.match(photoCard, /PhotoCard/);
  assert.match(photoCard, /LinearGradient/);
  assert.doesNotMatch(homeScreen, /\.\.\/data\/sampleData/);
  assert.match(homeScreen, /selectHomeViewModel/);
  assert.match(homeScreen, /onOpenEvent/);
  assert.doesNotMatch(calendarScreen, /\.\.\/data\/sampleData/);
  assert.match(calendarScreen, /selectCalendarViewModel/);
  assert.match(calendarScreen, /onOpenEvent/);
  assert.doesNotMatch(eventScreen, /\.\.\/data\/sampleData/);
  assert.match(eventScreen, /selectEventDetailViewModel/);
  assert.match(createEventScreen, /Plan the next event/);
  assert.match(createEventScreen, /Phone-first details/);
  assert.match(createEventScreen, /Preview invite/);
  assert.match(createEventScreen, /useLoopedInStore/);
  assert.match(createEventScreen, /updateDraftEvent/);
  assert.match(eventScreen, /setRsvpStatus/);
  assert.match(eventScreen, /Event gallery/);
  assert.match(eventScreen, /stageEventPhoto/);
  assert.match(eventScreen, /Reminder draft/);
  assert.match(eventScreen, /toggleReminderDraft/);
  assert.doesNotMatch(memoriesScreen, /\.\.\/data\/sampleData/);
  assert.match(memoriesScreen, /selectMemoriesViewModel/);
  assert.doesNotMatch(groupsScreen, /\.\.\/data\/sampleData/);
  assert.match(groupsScreen, /selectGroupsViewModel/);
  assert.doesNotMatch(homeScreen, /mobile MVP|A warmer private social calendar for real life/);
  assert.match(homeScreen, /PhotoCard/);
  assert.match(homeScreen, /Avatar/);
  assert.match(calendarScreen, /See the month, then drill into the moment\./);
  assert.match(eventScreen, /Event pulse/);
  assert.match(memoriesScreen, /Recap ingredients/);
  assert.match(groupsScreen, /Groups & onboarding/);
  assert.match(shell, /export function AppShell/);
  assert.match(shell, /BlurView/);
  assert.match(shell, /Ionicons/);
  assert.match(shell, /CalendarScreen/);
  assert.match(shell, /EventDetailScreen/);
  assert.match(shell, /openEventDetail/);
  assert.match(shell, /closeEventDetail/);
  assert.match(shell, /backLabel/);
  assert.match(shell, /CreateEventScreen/);
  assert.match(shell, /MemoriesScreen/);
  assert.match(shell, /GroupsScreen/);
  assert.match(shellState, /useAppShellState/);
  assert.match(shellState, /setActiveTab/);
  assert.match(shellState, /returnTab/);
  assert.match(shellState, /Groups/);
});

test('Home selectors expose populated and existing-group empty states', () => {
  const { selectHomeViewModel } = loadCompiledSelectors();

  const populated = selectHomeViewModel();
  assert.equal(populated.heroEvent.id, 'event-birthday-brunch');
  assert.match(populated.heroEvent.timeLabel, /Jul 18/);
  assert.ok(populated.activity.length > 0);
  assert.ok(populated.memories.length > 0);

  const empty = selectHomeViewModel({ events: [] });
  assert.equal(empty.heroEvent, null);
  assert.deepEqual(empty.activity, []);
  assert.deepEqual(empty.memories, []);
});

test('Home event identity reaches Event Detail and empty CTA reaches Create', () => {
  const { selectHomeViewModel, selectEventDetailViewModel } = loadCompiledSelectors();
  const homeEvent = selectHomeViewModel().heroEvent;
  assert.equal(selectEventDetailViewModel(homeEvent.id).id, homeEvent.id);

  const homeScreen = read('src/screens/HomeScreen.tsx');
  const shell = read('src/navigation/AppShell.tsx');
  assert.match(homeScreen, /onOpenEvent\?\.\(heroEvent\.id\)/);
  assert.match(homeScreen, /Create event/);
  assert.match(shell, /openEventDetail\('Home', eventId\)/);
  assert.match(shell, /onCreateEvent=\{\(\) => setActiveTab\('Create'\)\}/);
});
