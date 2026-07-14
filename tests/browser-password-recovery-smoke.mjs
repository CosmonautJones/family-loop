import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const appOrigin = process.env.RECOVERY_APP_ORIGIN ?? 'http://127.0.0.1:8086';
const apiUrl = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const mailUrl = process.env.INBUCKET_URL ?? 'http://127.0.0.1:54324';
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const chrome = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const email = `browser-recovery-${Date.now()}@loopedin.test`;
const oldPassword = 'Browser-old-42!';
const newPassword = 'Browser-new-84!';
const headers = (key) => ({ apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' });
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

assert.ok(anonKey && serviceKey, 'local Supabase keys are required');

const profile = await mkdtemp(path.join(os.tmpdir(), 'loopedin-recovery-chrome-'));
const port = 9400 + Math.floor(Math.random() * 300);
const browser = spawn(chrome, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--window-size=390,844', appOrigin,
], { stdio: 'ignore' });

let socket;
let userId;
let messageId;
let sequence = 0;
const pending = new Map();

async function connect() {
  let page;
  for (let attempt = 0; attempt < 100 && !page; attempt += 1) {
    await sleep(100);
    try { page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((item) => item.type === 'page'); } catch {}
  }
  assert.ok(page, 'headless Chrome opened the configured app');
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(String(data));
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message)); else resolve(message.result);
  };
}

function command(method, params = {}) {
  const id = ++sequence;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function waitFor(text) {
  for (let attempt = 0; attempt < 150; attempt += 1) {
    if (await evaluate(`document.body?.innerText.includes(${JSON.stringify(text)}) ?? false`)) return;
    await sleep(100);
  }
  const state = await evaluate(`({ text: document.body?.innerText.slice(0, 500), url: location.origin + location.pathname })`);
  throw new Error(`Timed out waiting for ${text}: ${JSON.stringify(state)}`);
}

const click = (text) => evaluate(`(() => { const element = [...document.querySelectorAll('[role="button"]')].find((item) => item.textContent.includes(${JSON.stringify(text)})); if (!element) return false; element.click(); return true; })()`);
const fill = (id, value) => evaluate(`(() => { const element = document.getElementById(${JSON.stringify(id)}); if (!element) return false; const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(element, ${JSON.stringify(value)}); element.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
const navigate = async (url) => { await command('Page.navigate', { url }); await sleep(300); };

try {
  const created = await fetch(`${apiUrl}/auth/v1/admin/users`, {
    method: 'POST', headers: headers(serviceKey),
    body: JSON.stringify({ email, password: oldPassword, email_confirm: true, user_metadata: { display_name: 'Browser Recovery' } }),
  });
  assert.equal(created.status, 200);
  userId = (await created.json()).id;

  await connect();
  await command('Page.enable');
  await command('Runtime.enable');
  await waitFor('Welcome back');
  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  assert.equal(await click('Forgot password?'), true);
  await waitFor('Reset your password');
  assert.equal(await fill('auth-email', email), true);
  assert.equal(await click('Send reset link'), true);
  await waitFor('Check your email');
  assert.equal(await evaluate(`document.documentElement.scrollWidth === document.documentElement.clientWidth`), true);

  let recoveryMessage;
  for (let attempt = 0; attempt < 50 && !recoveryMessage; attempt += 1) {
    await sleep(100);
    const list = await (await fetch(`${mailUrl}/api/v1/messages`)).json();
    recoveryMessage = list.messages?.find((message) => message.To?.some?.((recipient) => recipient.Address === email));
  }
  assert.ok(recoveryMessage);
  messageId = recoveryMessage.ID;
  const message = await (await fetch(`${mailUrl}/api/v1/message/${messageId}`)).json();
  const html = String(message.HTML ?? message.Text ?? '').replaceAll('&amp;', '&');
  const verifyUrl = html.match(/https?:\/\/[^"'<>\s]+\/auth\/v1\/verify\?[^"'<>\s]+/)?.[0];
  assert.ok(verifyUrl);
  const verified = await fetch(verifyUrl, { redirect: 'manual' });
  const validHash = new URL(verified.headers.get('location')).hash;
  assert.match(validHash, /type=recovery/);

  await navigate(`${appOrigin}/?proof=valid${validHash}`);
  await waitFor('Choose a new password');
  const formMetadata = await evaluate(`(() => { const password = document.getElementById('auth-password'); const confirm = document.getElementById('auth-confirm-password'); const button = [...document.querySelectorAll('[role="button"]')].find((item) => item.textContent.includes('Replace password')); return { password: password?.autocomplete, confirm: confirm?.autocomplete, passwordHeight: password?.getBoundingClientRect().height, confirmHeight: confirm?.getBoundingClientRect().height, buttonHeight: button?.getBoundingClientRect().height }; })()`);
  assert.deepEqual(formMetadata, { password: 'new-password', confirm: 'new-password', passwordHeight: 52, confirmHeight: 52, buttonHeight: 52 });
  await fill('auth-password', 'short');
  await fill('auth-confirm-password', 'different');
  await click('Replace password');
  await waitFor('Passwords do not match.');
  await fill('auth-password', newPassword);
  await fill('auth-confirm-password', newPassword);
  await click('Replace password');
  await waitFor('Password replaced');
  await click('Continue to LoopedIn');
  await waitFor('Start with your family');

  await command('Storage.clearDataForOrigin', { origin: appOrigin, storageTypes: 'all' });
  await navigate(appOrigin);
  await waitFor('Welcome back');
  await fill('auth-email', email);
  await fill('auth-password', oldPassword);
  await click('Sign in');
  await waitFor('Email or password not recognized.');
  await fill('auth-password', newPassword);
  await click('Sign in');
  await waitFor('Start with your family');
  await navigate(appOrigin);
  await waitFor('Start with your family');

  const replay = await fetch(verifyUrl, { redirect: 'manual' });
  const replayHash = new URL(replay.headers.get('location')).hash;
  assert.match(replayHash, /error/);
  await command('Storage.clearDataForOrigin', { origin: appOrigin, storageTypes: 'all' });
  await navigate(`${appOrigin}/?proof=replay${replayHash}`);
  await waitFor('This reset link can’t be used');
  await click('Request a new link');
  await waitFor('Reset your password');

  await command('Network.enable');
  await command('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await fill('auth-email', email);
  await click('Send reset link');
  await waitFor('Check your connection and try again.');
  await command('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });

  const final = await evaluate(`({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, headings: document.querySelectorAll('h1,[role="heading"][aria-level="1"]').length, alerts: document.querySelectorAll('[role="alert"]').length })`);
  assert.deepEqual(final, { width: 390, scrollWidth: 390, headings: 1, alerts: 1 });
  console.log('configured browser recovery: mobile request, reset validation, password replacement, old/new sign-in, reload, replay denial, and offline recovery passed');
} finally {
  if (userId) await fetch(`${apiUrl}/auth/v1/admin/users/${userId}`, { method: 'DELETE', headers: headers(serviceKey) });
  if (messageId) await fetch(`${mailUrl}/api/v1/messages`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ IDs: [messageId] }) });
  socket?.close();
  browser.kill();
  await rm(profile, { recursive: true, force: true }).catch(() => undefined);
}
