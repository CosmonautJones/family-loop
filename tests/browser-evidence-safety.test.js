import assert from 'node:assert/strict';
import test from 'node:test';
import { safeConsoleText, safeUrl } from '../scripts/browser-evidence-safety.mjs';

test('browser evidence URLs retain only origin and pathname', () => {
  assert.equal(
    safeUrl('http://user:password@127.0.0.1:54321/storage/photo.jpg?token=signed-value#fragment'),
    'http://127.0.0.1:54321/storage/photo.jpg',
  );
  assert.equal(safeUrl('not a URL'), '<invalid-url>');
});

test('browser console evidence redacts URLs and bare credential-shaped values', () => {
  const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJmYW1pbHkifQ.signaturevalue';
  const source = [
    'http://user:password@127.0.0.1:54321/storage/photo.jpg?token=signed-value#fragment',
    `Bearer ${jwt}`,
    `access_token=${jwt}`,
    `{"access_token":"${jwt}"}`,
    'refresh-token: refresh-value',
    'API key=api-key-value',
    'password: synthetic-password',
    'authorization: Basic basic-secret',
    'sb_secret_do-not-log-this',
    'sb_publishable_public-but-not-evidence',
  ].join(' ');
  const safe = safeConsoleText(source);
  assert.match(safe, /http:\/\/127\.0\.0\.1:54321\/storage\/photo\.jpg/);
  for (const secret of ['signed-value', 'user:password', jwt, 'refresh-value', 'api-key-value', 'synthetic-password', 'basic-secret', 'do-not-log-this', 'public-but-not-evidence']) {
    assert.doesNotMatch(safe, new RegExp(secret.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});
