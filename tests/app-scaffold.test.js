import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const appRoot = path.resolve('C:/Users/Travis/Desktop/Projects/family-loop/app');

function read(rel) {
  return fs.readFileSync(path.join(appRoot, rel), 'utf8');
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
    'src/types/domain.ts',
    'src/types/ui.ts',
    'src/lib/date.ts',
    'src/app/selectors.ts',
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
  const appSelectors = read('src/app/selectors.ts');
  const homeFixtures = read('src/features/home/fixtures.ts');
  const calendarFixtures = read('src/features/calendar/fixtures.ts');
  const groupFixtures = read('src/features/groups/fixtures.ts');
  const memoryFixtures = read('src/features/memories/fixtures.ts');
  const eventFixtures = read('src/features/events/fixtures.ts');
  const eventSelectors = read('src/features/events/selectors.ts');
  const createEvent = read('src/features/events/createEvent.ts');
  const eventData = read('src/features/events/eventData.ts');
  const eventFeatureIndex = read('src/features/events/index.ts');
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
  assert.match(ui, /export type AccentTone/);
  assert.match(dateLib, /formatEventDateRange/);
  assert.match(appSelectors, /selectHomeViewModel/);
  assert.match(appSelectors, /selectCalendarViewModel/);
  assert.match(appSelectors, /selectGroupsViewModel/);
  assert.match(appSelectors, /selectMemoriesViewModel/);
  assert.match(appSelectors, /selectEventDetailViewModel/);
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
  assert.doesNotMatch(homeScreen, /\.\.\/data\/sampleData/);
  assert.match(homeScreen, /selectHomeViewModel/);
  assert.doesNotMatch(calendarScreen, /\.\.\/data\/sampleData/);
  assert.match(calendarScreen, /selectCalendarViewModel/);
  assert.doesNotMatch(eventScreen, /\.\.\/data\/sampleData/);
  assert.match(eventScreen, /selectEventDetailViewModel/);
  assert.match(createEventScreen, /Create event draft/);
  assert.match(createEventScreen, /buildCreateEventFields/);
  assert.doesNotMatch(memoriesScreen, /\.\.\/data\/sampleData/);
  assert.match(memoriesScreen, /selectMemoriesViewModel/);
  assert.doesNotMatch(groupsScreen, /\.\.\/data\/sampleData/);
  assert.match(groupsScreen, /selectGroupsViewModel/);
  assert.match(homeScreen, /A private social calendar for real life\./);
  assert.match(calendarScreen, /See the month, then drill into the moment\./);
  assert.match(eventScreen, /Event pulse/);
  assert.match(memoriesScreen, /Recap ingredients/);
  assert.match(groupsScreen, /Groups & onboarding/);
  assert.match(shell, /export function AppShell/);
  assert.match(shell, /Bottom navigation/);
  assert.match(shell, /CalendarScreen/);
  assert.match(shell, /CreateEventScreen/);
  assert.match(shell, /MemoriesScreen/);
  assert.match(shell, /GroupsScreen/);
  assert.match(shellState, /useAppShellState/);
  assert.match(shellState, /setActiveTab/);
  assert.match(shellState, /Groups/);
});
