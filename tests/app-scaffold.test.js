import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const appRoot = path.resolve('C:/Users/Travis/Desktop/Projects/family-loop/app');

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
    'src/screens/HomeScreen.tsx',
    'src/screens/CalendarScreen.tsx',
    'src/screens/EventDetailScreen.tsx',
    'src/screens/MemoriesScreen.tsx',
    'src/screens/GroupsScreen.tsx',
    'src/navigation/AppShell.tsx',
    'src/navigation/useAppShellState.ts',
  ]) {
    assert.equal(fs.existsSync(path.join(appRoot, rel)), true, `${rel} should exist`);
  }
});

test('App entry composes the navigation shell', () => {
  const content = fs.readFileSync(path.join(appRoot, 'App.tsx'), 'utf8');
  assert.match(content, /AppShell/);
  assert.doesNotMatch(content, /Lake Picnic with Family/);
});

test('foundation modules expose theme, data, screens, and shell structure', () => {
  const tokens = fs.readFileSync(path.join(appRoot, 'src/theme/tokens.ts'), 'utf8');
  const chip = fs.readFileSync(path.join(appRoot, 'src/components/Chip.tsx'), 'utf8');
  const button = fs.readFileSync(path.join(appRoot, 'src/components/Button.tsx'), 'utf8');
  const card = fs.readFileSync(path.join(appRoot, 'src/components/SurfaceCard.tsx'), 'utf8');
  const sampleData = fs.readFileSync(path.join(appRoot, 'src/data/sampleData.ts'), 'utf8');
  const homeScreen = fs.readFileSync(path.join(appRoot, 'src/screens/HomeScreen.tsx'), 'utf8');
  const calendarScreen = fs.readFileSync(path.join(appRoot, 'src/screens/CalendarScreen.tsx'), 'utf8');
  const eventScreen = fs.readFileSync(path.join(appRoot, 'src/screens/EventDetailScreen.tsx'), 'utf8');
  const memoriesScreen = fs.readFileSync(path.join(appRoot, 'src/screens/MemoriesScreen.tsx'), 'utf8');
  const groupsScreen = fs.readFileSync(path.join(appRoot, 'src/screens/GroupsScreen.tsx'), 'utf8');
  const shell = fs.readFileSync(path.join(appRoot, 'src/navigation/AppShell.tsx'), 'utf8');
  const shellState = fs.readFileSync(path.join(appRoot, 'src/navigation/useAppShellState.ts'), 'utf8');

  assert.match(tokens, /export const palette/);
  assert.match(tokens, /export const spacing/);
  assert.match(tokens, /export const radii/);
  assert.match(chip, /export function Chip/);
  assert.match(button, /export function Button/);
  assert.match(card, /export function SurfaceCard/);
  assert.match(sampleData, /Lake Picnic with Family/);
  assert.match(sampleData, /export const appSections/);
  assert.match(sampleData, /export const eventDetail/);
  assert.match(homeScreen, /A private social calendar for real life\./);
  assert.match(calendarScreen, /See the month, then drill into the moment\./);
  assert.match(eventScreen, /Event pulse/);
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
