import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const appRoot = path.resolve('app');
const read = (relativePath) => fs.readFileSync(path.join(appRoot, relativePath), 'utf8');

test('web form fields expose stable identifiers and intentional autocomplete metadata', () => {
  const auth = read('src/screens/AuthScreen.tsx');
  const create = read('src/screens/CreateEventScreen.tsx');
  const detail = read('src/screens/EventDetailScreen.tsx');
  const onboarding = read('src/screens/FamilyOnboardingScreen.tsx');
  const family = read('src/screens/GroupsScreen.tsx');

  for (const id of ['auth-display-name', 'auth-email', 'auth-password', 'auth-confirm-password']) {
    assert.match(auth, new RegExp(`nativeID="${id}"`));
  }
  assert.match(auth, /autoComplete="name"/);
  assert.match(auth, /autoComplete="email"/);
  assert.match(auth, /autoComplete=\{mode === 'signUp' \|\| auth\.recoveryStatus === 'ready' \? 'new-password' : 'current-password'\}/);

  for (const source of [create, detail, onboarding, family]) {
    const inputs = source.match(/<TextInput(?:\s|\/)[\s\S]*?\/>/g) ?? [];
    assert.ok(inputs.length > 0);
    for (const input of inputs) assert.match(input, /nativeID=/);
  }

  assert.match(create, /nativeID=\{`create-\$\{field\.key\}-input`\}[\s\S]*?autoComplete=\{field\.autoComplete\}/);
  assert.match(detail, /nativeID="event-message-input"[\s\S]*?autoComplete="off"/);
  assert.match(detail, /nativeID="event-photo-url-input"[\s\S]*?autoComplete="url"/);
  assert.match(detail, /nativeID="event-photo-photographer-input"[\s\S]*?autoComplete="name"/);
  assert.match(onboarding, /nativeID="family-invitation-code-input"[\s\S]*?autoComplete="off"/);
  assert.match(family, /nativeID="family-invite-email-input"[\s\S]*?autoComplete="email"/);
});
