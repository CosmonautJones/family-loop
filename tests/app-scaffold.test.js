import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const appRoot = path.resolve('C:/Users/Travis/Desktop/Projects/family-loop/app');

function readAppFile(relativePath) {
  return fs.readFileSync(path.join(appRoot, relativePath), 'utf8');
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
    'src/data/sampleData.ts',
    'src/features/events/eventData.ts',
    'src/features/events/createEvent.ts',
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
});

test('App entry composes the navigation shell', () => {
  const content = readAppFile('App.tsx');
  assert.match(content, /AppShell/);
  assert.doesNotMatch(content, /Lake Picnic with Family/);
});

test('event feature modules expose create flow and shared calendar data', () => {
  const eventData = readAppFile('src/features/events/eventData.ts');
  const createEvent = readAppFile('src/features/events/createEvent.ts');
  const eventIndex = readAppFile('src/features/events/index.ts');
  const sampleData = readAppFile('src/data/sampleData.ts');

  assert.match(eventData, /export type EventRecord/);
  assert.match(eventData, /export const eventCollection/);
  assert.match(eventData, /export const calendarDays/);
  assert.match(eventData, /export function getFeaturedEvent/);
  assert.match(eventData, /export function getEventById/);
  assert.match(eventData, /draftEventTemplate/);
  assert.match(createEvent, /export type CreateEventDraft/);
  assert.match(createEvent, /export function buildCreateEventFields/);
  assert.match(createEvent, /export function summarizeDraftEvent/);
  assert.match(createEvent, /cover treatment/i);
  assert.match(eventIndex, /from '\.\/eventData'/);
  assert.match(eventIndex, /from '\.\/createEvent'/);
  assert.match(sampleData, /from '\.\.\/features\/events'/);
  assert.match(sampleData, /heroEvent = getFeaturedEvent\(\)/);
  assert.match(sampleData, /eventDetail = getEventById\('birthday-brunch'\)/);
});

test('calendar, event detail, and create screens consume the shared event feature', () => {
  const calendarScreen = readAppFile('src/screens/CalendarScreen.tsx');
  const eventScreen = readAppFile('src/screens/EventDetailScreen.tsx');
  const createScreen = readAppFile('src/screens/CreateEventScreen.tsx');
  const shell = readAppFile('src/navigation/AppShell.tsx');

  assert.match(calendarScreen, /calendarDays/);
  assert.match(calendarScreen, /eventCollection/);
  assert.match(calendarScreen, /Host checklist/);
  assert.match(calendarScreen, /Day spotlight/);
  assert.match(eventScreen, /eventDetail\.host/);
  assert.match(eventScreen, /eventDetail\.location/);
  assert.match(eventScreen, /eventDetail\.invitees/);
  assert.match(eventScreen, /coverTreatment/);
  assert.match(createScreen, /Create event draft/);
  assert.match(createScreen, /buildCreateEventFields/);
  assert.match(createScreen, /summarizeDraftEvent/);
  assert.match(createScreen, /Invitees/);
  assert.match(createScreen, /Cover treatment/);
  assert.match(shell, /CreateEventScreen/);
  assert.doesNotMatch(shell, /function CreateScreen/);
});

test('foundation modules still expose theme, screens, and shell structure', () => {
  const tokens = readAppFile('src/theme/tokens.ts');
  const chip = readAppFile('src/components/Chip.tsx');
  const button = readAppFile('src/components/Button.tsx');
  const card = readAppFile('src/components/SurfaceCard.tsx');
  const homeScreen = readAppFile('src/screens/HomeScreen.tsx');
  const memoriesScreen = readAppFile('src/screens/MemoriesScreen.tsx');
  const groupsScreen = readAppFile('src/screens/GroupsScreen.tsx');
  const shell = readAppFile('src/navigation/AppShell.tsx');
  const shellState = readAppFile('src/navigation/useAppShellState.ts');

  assert.match(tokens, /export const palette/);
  assert.match(tokens, /export const spacing/);
  assert.match(tokens, /export const radii/);
  assert.match(chip, /export function Chip/);
  assert.match(button, /export function Button/);
  assert.match(card, /export function SurfaceCard/);
  assert.match(homeScreen, /A private social calendar for real life\./);
  assert.match(memoriesScreen, /Recap ingredients/);
  assert.match(groupsScreen, /Groups & onboarding/);
  assert.match(shell, /export function AppShell/);
  assert.match(shell, /Bottom navigation/);
  assert.match(shell, /CalendarScreen/);
  assert.match(shell, /MemoriesScreen/);
  assert.match(shell, /GroupsScreen/);
  assert.match(shellState, /useAppShellState/);
  assert.match(shellState, /setActiveTab/);
  assert.match(shellState, /Groups/);
});
