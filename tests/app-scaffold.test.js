import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const appRoot = path.resolve('C:/Users/Travis/Desktop/Projects/family-loop/app');

test('mobile scaffold files exist', () => {
  for (const rel of ['package.json', 'app.json', 'tsconfig.json', 'App.tsx', 'index.ts', 'README.md']) {
    assert.equal(fs.existsSync(path.join(appRoot, rel)), true, `${rel} should exist`);
  }
});

test('App scaffold includes Loop hero copy', () => {
  const content = fs.readFileSync(path.join(appRoot, 'App.tsx'), 'utf8');
  assert.match(content, /A private social calendar for real life\./);
  assert.match(content, /Lake Picnic with Family/);
  assert.match(content, /Loop mobile MVP/);
});
