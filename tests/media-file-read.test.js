import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../app/package.json', import.meta.url));
const ts = require('typescript');
const source = readFileSync(new URL('../app/src/services/supabaseAdapter.ts', import.meta.url), 'utf8');
const output = ts.transpileModule(`${source}\nexport { fetchValidatedMediaBlob };`, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAAJOgAACToAYJjBRwAAAAvSURBVFhH7c6hAQAACMOwnc7n4DkATERNVVKp/ix7XAcAAAAAAAAAAAAAAAAAADCbsfxqM57u1AAAAABJRU5ErkJggg==', 'base64');

function photoReader(fetch) {
  const module = { exports: {} };
  Function('require', 'module', 'exports', 'fetch', output)((id) => {
    if (id === './mediaValidation') return { maxBrowserImageBytes: 1048576 };
    if (id === './serviceErrors') return { userServiceError: message => new Error(message) };
    return {};
  }, module, module.exports, fetch);
  return module.exports.fetchValidatedMediaBlob;
}

test('selected image bytes are read without a network fetch blocked by release CSP', async () => {
  let calls = 0;
  const read = photoReader(async () => { calls++; throw new TypeError('Failed to fetch'); });
  const blob = await read(`data:image/png;base64,${png.toString('base64')}`);
  assert.equal(calls, 0);
  assert.equal(blob.type, 'image/png');
  assert.deepEqual(Buffer.from(await blob.arrayBuffer()), png);
});

test('local photo parsing retains size, format, base64, and image-signature checks', async () => {
  let calls = 0;
  const read = photoReader(async () => { calls++; throw new TypeError('Failed to fetch'); });
  await assert.rejects(read('data:text/plain;base64,aGk='), /JPEG, PNG, or WebP/);
  await assert.rejects(read('data:image/png;base64,%%%'), /valid image/);
  await assert.rejects(read('data:image/png;base64,A'), /valid image/);
  await assert.rejects(read('data:image/png;base64,aGk='), /valid image/);
  await assert.rejects(read(`data:image/png;base64,${Buffer.alloc(1048577).toString('base64')}`), /no larger than 1 MB/);
  assert.equal(calls, 0);
});

test('HTTPS image sources still use the existing fetch and byte-validation path', async () => {
  const calls = [];
  const read = photoReader(async url => { calls.push(url); return new Response(png, { headers: { 'Content-Type': 'image/png' } }); });
  const blob = await read('https://example.test/photo.png');
  assert.deepEqual(calls, ['https://example.test/photo.png']);
  assert.deepEqual(Buffer.from(await blob.arrayBuffer()), png);
});
