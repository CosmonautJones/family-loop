import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const appOrigin = process.env.LOOPEDIN_WEB_URL ?? 'http://127.0.0.1:8090';
const apiUrl = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY;
const password = process.env.LOOPEDIN_LOCAL_PASSWORD;
const marker = process.env.LOOPEDIN_RUN_MARKER ?? 'family-browser-v1';
const chromePath = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
assert.ok(apiUrl && /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(apiUrl), 'SUPABASE_URL must be loopback');
assert.ok(/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(appOrigin), 'LOOPEDIN_WEB_URL must be loopback');
assert.ok(key && password, 'Local publishable key and password are required');

const ownerEmail = `browser-owner-${marker}@loopedin.test`;
const api = async (path, token, init = {}) => {
  const response = await fetch(`${apiUrl}${path}`, { ...init, headers: { apikey: key, Authorization: `Bearer ${token}`, ...(init.headers ?? {}) } });
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(`Local API ${response.status}: ${JSON.stringify(body)}`);
  return body;
};
const auth = await api('/auth/v1/token?grant_type=password', key, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: ownerEmail, password }),
});
const events = await api('/rest/v1/loopedin_events?select=id,title&order=starts_at.asc&limit=1', auth.access_token);
assert.equal(events.length, 1);
const eventId = events[0].id;
await api(`/rest/v1/loopedin_reminder_drafts?event_id=eq.${eventId}`, auth.access_token, { method: 'DELETE' });

const profile = mkdtempSync(join(tmpdir(), 'loopedin-reminder-browser-'));
const chrome = spawn(chromePath, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore', windowsHide: true });
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let socket;
let sequence = 0;
const pending = new Map();
let kongStopped = false;

async function debugPort() {
  const file = join(profile, 'DevToolsActivePort');
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (existsSync(file)) return Number(readFileSync(file, 'utf8').split(/\r?\n/)[0]);
    await delay(50);
  }
  throw new Error('Chrome DevTools port did not become ready.');
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
async function eventually(predicate, label, timeout = 20_000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await predicate()) return;
    await delay(100);
  }
  throw new Error(`Timed out: ${label}\n${String(await evaluate('document.body?.innerText')).slice(0, 1_000)}`);
}
const fill = (id, value) => evaluate(`(() => { const element=document.getElementById(${JSON.stringify(id)}); if(!element)return false; const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; setter.call(element,${JSON.stringify(value)}); element.dispatchEvent(new Event('input',{bubbles:true})); return true; })()`);
const clickText = (text) => evaluate(`(() => { const element=[...document.querySelectorAll('button,[role=button]')].find((item)=>item.textContent?.trim()===${JSON.stringify(text)}); if(!element)return false; element.click(); return true; })()`);
const clickSwitch = () => evaluate(`(() => { const element=document.querySelector('[role=switch]'); if(!element)return false; element.click(); return true; })()`);
const switchState = () => evaluate(`document.querySelector('[role=switch]')?.getAttribute('aria-checked')`);

try {
  const port = await debugPort();
  const target = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' }).then((response) => response.json());
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(String(data));
    if (!message.id || !pending.has(message.id)) return;
    const handlers = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) handlers.reject(new Error(message.error.message)); else handlers.resolve(message.result);
  };
  await command('Page.enable');
  await command('Runtime.enable');
  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await command('Page.navigate', { url: appOrigin });
  await eventually(async () => (await evaluate('document.body?.innerText'))?.includes('Welcome back'), 'sign-in form');
  assert.equal(await fill('auth-email', ownerEmail), true);
  assert.equal(await fill('auth-password', password), true);
  assert.equal(await clickText('Sign in'), true);
  await eventually(async () => !(await evaluate('document.body?.innerText'))?.includes('Welcome back'), 'authenticated shell');
  await evaluate(`location.hash=${JSON.stringify(`#/event/${eventId}?from=home`)}`);
  await eventually(async () => (await evaluate('document.body?.innerText'))?.includes('Event reminder'), 'exact event reminder');
  await eventually(async () => await evaluate("Boolean(document.querySelector('[role=switch]'))"), 'reminder preference control');

  const initial = await evaluate(`(() => { const control=document.querySelector('[role=switch]'); const rect=control?.getBoundingClientRect(); return { checked: control?.getAttribute('aria-checked'), height: rect?.height, width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, timing: document.body.innerText.includes('Morning of event'), honest: document.body.innerText.includes('Push and email delivery are not active.') }; })()`);
  assert.deepEqual(initial, { checked: 'false', height: 48, width: 390, scrollWidth: 390, timing: true, honest: true });
  assert.equal(await clickSwitch(), true);
  await eventually(async () => await switchState() === 'true', 'preference enabled');
  await command('Page.reload', { ignoreCache: true });
  await eventually(async () => await switchState() === 'true', 'preference retained after reload');
  assert.ok((await evaluate('location.hash')).includes(eventId), 'exact-event deep link survives reload');

  await evaluate('document.activeElement?.blur()');
  for (let index = 0; index < 30 && !(await evaluate("document.activeElement?.getAttribute('role') === 'switch'")); index += 1) {
    await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab' });
    await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab' });
  }
  const focus = await evaluate(`(() => { const control=document.querySelector('[role=switch]'); const style=getComputedStyle(control); return { focused: document.activeElement===control, focusVisible: control.matches(':focus-visible'), outlineWidth: style.outlineWidth }; })()`);
  assert.equal(focus.focused, true);
  assert.equal(focus.focusVisible, true);

  execFileSync('docker', ['stop', 'supabase_kong_family-loop'], { stdio: 'ignore' });
  kongStopped = true;
  assert.equal(await clickSwitch(), true);
  await eventually(async () => (await evaluate('document.body?.innerText'))?.includes('Your choice is ready to retry.'), 'failed preference keeps retry intent');
  assert.equal(await switchState(), 'true', 'failed disable must retain server-confirmed on state');
  assert.equal((await evaluate('document.body?.innerText')).includes('Retry turning off'), true);
  execFileSync('docker', ['start', 'supabase_kong_family-loop'], { stdio: 'ignore' });
  kongStopped = false;
  await eventually(async () => fetch(`${apiUrl}/auth/v1/health`).then((response) => response.ok).catch(() => false), 'local gateway recovery');
  assert.equal(await clickText('Retry turning off'), true);
  await eventually(async () => await switchState() === 'false', 'retry disables preference');

  console.log(`Configured reminder browser PASS: viewport=390; height=48; focusVisible=${focus.focusVisible}; deepLink=retained; failureIntent=retained; retry=off; overflow=none`);
} finally {
  if (kongStopped) execFileSync('docker', ['start', 'supabase_kong_family-loop'], { stdio: 'ignore' });
  await delay(500);
  await api(`/rest/v1/loopedin_reminder_drafts?event_id=eq.${eventId}`, auth.access_token, { method: 'DELETE' }).catch(() => undefined);
  socket?.close();
  chrome.kill();
  await delay(500);
  rmSync(profile, { recursive: true, force: true });
}
