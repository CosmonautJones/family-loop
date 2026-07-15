import assert from 'node:assert/strict';
import { createClient } from '../app/node_modules/@supabase/supabase-js/dist/index.mjs';

const apiUrl = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const inbucketUrl = process.env.INBUCKET_URL ?? 'http://127.0.0.1:54324';
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const run = process.env.RECOVERY_RUN ?? `recovery-${Date.now()}`;
const email = `${run}@loopedin.test`;
const unknownEmail = `unknown-${run}@loopedin.test`;
const oldPassword = `Old-${run}-42!`;
const newPassword = `New-${run}-84!`;
const redirectTo = 'http://127.0.0.1:3000';

assert.ok(anonKey, 'SUPABASE_ANON_KEY is required');
assert.ok(serviceRoleKey, 'SUPABASE_SERVICE_ROLE_KEY is required');

const headers = (key) => ({ apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' });
const admin = (path, init = {}) => fetch(`${apiUrl}/auth/v1/admin${path}`, { ...init, headers: { ...headers(serviceRoleKey), ...init.headers } });
const messages = async () => (await (await fetch(`${inbucketUrl}/api/v1/messages`)).json()).messages ?? [];
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

let userId;
let recoveryMessageId;
try {
  const createdResponse = await admin('/users', {
    method: 'POST',
    body: JSON.stringify({ email, password: oldPassword, email_confirm: true, user_metadata: { display_name: 'Recovery Proof' } }),
  });
  assert.equal(createdResponse.status, 200, `create disposable user: ${createdResponse.status}`);
  userId = (await createdResponse.json()).id;

  const before = await messages();
  const request = (targetEmail) => fetch(`${apiUrl}/auth/v1/recover`, {
    method: 'POST',
    headers: headers(anonKey),
    body: JSON.stringify({ email: targetEmail, redirect_to: redirectTo }),
  });
  const known = await request(email);
  const knownBody = await known.text();
  const unknown = await request(unknownEmail);
  const unknownBody = await unknown.text();
  assert.equal(known.status, unknown.status, 'known and unknown requests return the same status');
  assert.equal(knownBody, unknownBody, 'known and unknown requests return the same body');

  let recoveryMessage;
  for (let attempt = 0; attempt < 30 && !recoveryMessage; attempt += 1) {
    await sleep(100);
    recoveryMessage = (await messages()).find((message) => message.To?.some?.((recipient) => recipient.Address === email));
  }
  assert.ok(recoveryMessage, 'known account receives one local recovery email');
  recoveryMessageId = recoveryMessage.ID;
  const after = await messages();
  assert.equal(after.filter((message) => message.To?.some?.((recipient) => recipient.Address === email)).length, 1);
  assert.equal(after.some((message) => message.To?.some?.((recipient) => recipient.Address === unknownEmail)), false);
  assert.equal(after.length, before.length + 1, 'unknown request creates no local message');

  const message = await (await fetch(`${inbucketUrl}/api/v1/message/${recoveryMessage.ID}`)).json();
  const html = String(message.HTML ?? message.Html ?? message.Text ?? '').replaceAll('&amp;', '&');
  const verifyUrl = html.match(/https?:\/\/[^"'<>\s]+\/auth\/v1\/verify\?[^"'<>\s]+/)?.[0];
  assert.ok(verifyUrl, 'email contains a recovery verification URL');
  assert.match(decodeURIComponent(verifyUrl), /type=recovery/);
  assert.match(decodeURIComponent(verifyUrl), /redirect_to=http:\/\/127\.0\.0\.1:3000/);

  const verified = await fetch(verifyUrl, { redirect: 'manual' });
  assert.ok([302, 303].includes(verified.status), `recovery verify redirect: ${verified.status}`);
  const location = verified.headers.get('location');
  assert.ok(location?.startsWith(redirectTo));
  const fragment = new URLSearchParams(new URL(location).hash.slice(1));
  assert.equal(fragment.get('type'), 'recovery');
  assert.ok(fragment.get('access_token'));
  assert.ok(fragment.get('refresh_token'));

  const client = createClient(apiUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const session = await client.auth.setSession({ access_token: fragment.get('access_token'), refresh_token: fragment.get('refresh_token') });
  assert.equal(session.error, null);
  assert.equal((await client.auth.updateUser({ password: newPassword })).error, null);
  await client.auth.signOut({ scope: 'local' });

  const oldLogin = await client.auth.signInWithPassword({ email, password: oldPassword });
  assert.ok(oldLogin.error, 'old password fails after replacement');
  const newLogin = await client.auth.signInWithPassword({ email, password: newPassword });
  assert.equal(newLogin.error, null, 'new password signs in');
  await client.auth.signOut({ scope: 'local' });

  const replay = await fetch(verifyUrl, { redirect: 'manual' });
  const replayLocation = replay.headers.get('location') ?? '';
  assert.doesNotMatch(replayLocation, /access_token=/, 'reused recovery link returns no session');
  assert.match(replayLocation, /error|error_code/, 'reused recovery link is explicit');

  const invalidUrl = new URL(verifyUrl);
  invalidUrl.searchParams.set('token', 'invalid-recovery-token');
  const invalid = await fetch(invalidUrl, { redirect: 'manual' });
  assert.doesNotMatch(invalid.headers.get('location') ?? '', /access_token=/, 'invalid recovery link returns no session');

  console.log('local Supabase recovery: neutral known/unknown request, approved callback, password replacement, replay denial, and invalid-link denial passed');
} finally {
  if (userId) await admin(`/users/${userId}`, { method: 'DELETE' });
  if (recoveryMessageId) await fetch(`${inbucketUrl}/api/v1/messages`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ IDs: [recoveryMessageId] }),
  }).catch(() => undefined);
}
