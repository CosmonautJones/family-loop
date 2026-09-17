import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../app');
const appRequire = createRequire(path.join(app, 'package.json'));
const ts = appRequire('typescript');

// Exercise the real adapter and error handling, replacing only the external client/config.
function harness({ response = { data: { session: null }, error: null }, match = { data: { ok: true, code: 'ready' }, error: null } } = {}) {
  const calls = [];
  const client = {
    auth: { signUp: async (input) => { calls.push(['signup', input]); return response; } },
    rpc: async (name, input) => { calls.push([name, input]); return match; },
  };
  const cache = new Map();
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
    Function('require', 'module', 'exports', output)((id) => {
      if (id === './supabaseClient') return { getSupabaseClient: () => client };
      if (id === '../config/runtimeConfig') return { getRuntimeConfig: () => ({ environment: 'local' }), getReleaseId: () => 'test' };
      if (id.startsWith('.')) return load(path.resolve(path.dirname(filename), `${id}.ts`));
      return appRequire(id);
    }, module, module.exports);
    return module.exports;
  }
  return { service: load(path.join(app, 'src/services/supabaseAdapter.ts')).createSupabaseLoopedInService(), calls };
}

test('public signup needs no invitation and sends only account fields to Auth', async () => {
  const { service, calls } = harness();
  assert.deepEqual(await service.auth.signUp(null, ' Alex ', ' alex@example.com ', 'Secret-123!'), { status: 'confirmationOrSignInRequired' });
  assert.deepEqual(calls, [['signup', { email: 'alex@example.com', password: 'Secret-123!', options: { data: { display_name: 'Alex' } } }]]);
});

test('valid invited signup verifies the email before creating the account', async () => {
  const { service, calls } = harness();
  await service.auth.signUp('A'.repeat(43), 'Alex', 'alex@example.com', 'Secret-123!');
  assert.deepEqual(calls.map(([name]) => name), ['loopedin_match_group_invite_email', 'signup']);
  assert.equal(calls[0][1].target_token, '00'.repeat(32));
});

test('an invalid or unavailable invite never falls back to public signup', async () => {
  for (const token of ['', 'broken', 'A'.repeat(43)]) {
    const { service, calls } = harness({ match: { data: { ok: false, code: 'unavailable' }, error: null } });
    await assert.rejects(service.auth.signUp(token, 'Alex', 'alex@example.com', 'Secret-123!'), /invitation can’t be used/);
    assert.equal(calls.some(([name]) => name === 'signup'), false);
  }
});

test('public signup rejects invalid input before making requests', async () => {
  for (const input of [['', 'alex@example.com', 'Secret-123!'], ['A'.repeat(81), 'alex@example.com', 'Secret-123!'], ['Alex', 'bad-address', 'Secret-123!'], ['Alex', 'alex@example.com', 'short']]) {
    const { service, calls } = harness();
    await assert.rejects(service.auth.signUp(null, ...input));
    assert.deepEqual(calls, []);
  }
});

test('public existing-account guidance does not send a founder back to a nonexistent invite', async () => {
  const { service } = harness({ response: { data: null, error: { code: 'user_already_exists' } } });
  await assert.rejects(service.auth.signUp(null, 'Alex', 'alex@example.com', 'Secret-123!'), (error) => /Sign in/.test(error.message) && !/invitation/.test(error.message));
});

test('public signup preserves an immediate authenticated result when Auth returns a session', async () => {
  const { service } = harness({ response: { data: { session: { user: { id: 'new-founder', email: 'alex@example.com' }, access_token: 'test-session', expires_at: 1234 } }, error: null } });
  const result = await service.auth.signUp(null, 'Alex', 'alex@example.com', 'Secret-123!');
  assert.equal(result.status, 'authenticated');
  assert.equal(result.session.userId, 'new-founder');
});

test('signup rate limits and provider failures stay safe and actionable', async () => {
  for (const [error, message] of [[{ status: 429 }, /Too many attempts/], [{ message: 'private provider details' }, /Try again in a moment/]]) {
    const { service } = harness({ response: { data: null, error } });
    await assert.rejects(service.auth.signUp(null, 'Alex', 'alex@example.com', 'Secret-123!'), (cause) => message.test(cause.message) && !cause.message.includes('private provider details'));
  }
});
