import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY;
const password = process.env.LOOPEDIN_LOCAL_PASSWORD;
const marker = process.env.LOOPEDIN_RUN_MARKER ?? 'family-browser-v1';
const webUrl = process.env.LOOPEDIN_WEB_URL ?? 'http://127.0.0.1:8086';
assert.ok(url && /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url), 'SUPABASE_URL must be loopback');
assert.ok(/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(webUrl), 'LOOPEDIN_WEB_URL must be loopback');
assert.ok(key && password, 'Local publishable key and password are required');

const email = (name) => `browser-${name}-${marker}@loopedin.test`;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const api = async (path, token, init = {}) => {
  const response = await fetch(`${url}${path}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
  });
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(`Local API ${response.status}: ${JSON.stringify(body)}`);
  return body;
};
const session = async (name) => api('/auth/v1/token?grant_type=password', key, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: email(name), password }),
});

class Page {
  constructor(socket) {
    this.socket = socket;
    this.id = 0;
    this.pending = new Map();
    socket.onmessage = ({ data }) => {
      const message = JSON.parse(data);
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    };
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  }
  async body() { return this.evaluate('document.body?.innerText ?? ""'); }
  async eventually(predicate, label, timeout = 20_000) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      if (await predicate()) return;
      await wait(100);
    }
    throw new Error(`Timed out: ${label}\n${(await this.body()).slice(0, 1_000)}`);
  }
  async close() {
    await Promise.race([this.send('Page.close').catch(() => undefined), wait(500)]);
    this.socket.close();
  }
}

const connect = async (port) => {
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const target = targets.find((item) => item.type === 'page' && item.url.startsWith(webUrl)) ?? targets.find((item) => item.type === 'page');
  assert.ok(target, `No Chrome page found on ${port}`);
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  const page = new Page(socket);
  await page.send('Runtime.enable');
  return page;
};

const setValue = (selector, value) => `(() => {
  const element = document.querySelector(${JSON.stringify(selector)});
  if (!element) return false;
  const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, ${JSON.stringify(value)});
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
})()`;
const clickText = (text) => `(() => {
  const element = [...document.querySelectorAll('button,[role="button"]')].find((candidate) => candidate.innerText?.trim() === ${JSON.stringify(text)});
  if (!element) return false;
  element.click();
  return true;
})()`;
const login = async (page, name) => {
  await page.eventually(async () => (await page.body()).includes('Welcome back'), `${name} sign-in form`);
  assert.equal(await page.evaluate(setValue('#auth-email', email(name))), true);
  assert.equal(await page.evaluate(setValue('#auth-password', password)), true);
  assert.equal(await page.evaluate(clickText('Sign in')), true);
  await page.eventually(async () => !(await page.body()).includes('Welcome back'), `${name} authenticated`);
};
const openEvent = async (page, eventId, title) => {
  await page.evaluate(`window.location.hash=${JSON.stringify(`#/event/${eventId}?from=home`)}`);
  await page.eventually(async () => (await page.body()).includes(title), `${title} opens`);
};
const sendComment = async (page, body) => {
  assert.equal(await page.evaluate(setValue('#event-message-input', body)), true);
  await page.eventually(async () => await page.evaluate(clickText('Send')), 'Send becomes enabled');
  await page.eventually(async () => (await page.body()).includes(body), `sender sees ${body}`);
};
const countText = (page, text) => page.evaluate(`(document.body?.innerText.match(new RegExp(${JSON.stringify(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))}, 'g')) ?? []).length`);

const pages = [];
let ownerToken;
let eventId;
let realtimeStopped = false;
try {
  const ownerSession = await session('owner');
  ownerToken = ownerSession.access_token;
  const memberships = await api(`/rest/v1/loopedin_group_members?select=group_id&user_id=eq.${ownerSession.user.id}&limit=1`, ownerToken);
  assert.equal(memberships.length, 1);
  const created = await api('/rest/v1/loopedin_events?select=id', ownerToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({
      group_id: memberships[0].group_id,
      created_by: ownerSession.user.id,
      title: `Browser realtime proof ${marker}`,
      starts_at: '2027-08-02T15:00:00Z',
      ends_at: '2027-08-02T17:00:00Z',
      location: 'Loopback browser',
      description: 'Disposable browser realtime proof',
    }),
  });
  eventId = created[0].id;
  const otherEvents = await api(`/rest/v1/loopedin_events?select=id,title&id=neq.${eventId}&limit=1`, ownerToken);
  assert.equal(otherEvents.length, 1);

  const owner = await connect(9331);
  const maya = await connect(9332);
  const outsider = await connect(9333);
  pages.push(owner, maya, outsider);
  await login(owner, 'owner');
  await login(maya, 'maya');
  await login(outsider, 'outsider');
  const title = `Browser realtime proof ${marker}`;
  await openEvent(owner, eventId, title);
  await openEvent(maya, eventId, title);
  await outsider.evaluate(`window.location.hash=${JSON.stringify(`#/event/${eventId}?from=home`)}`);

  const liveBody = `Browser live once ${marker}`;
  await sendComment(owner, liveBody);
  await maya.eventually(async () => (await maya.body()).includes(liveBody), 'Maya receives live comment without reload');
  assert.equal(await countText(maya, liveBody), 1);
  assert.equal((await outsider.body()).includes(liveBody), false);

  await openEvent(maya, otherEvents[0].id, otherEvents[0].title);
  const switchedBody = `No stale route ${marker}`;
  await sendComment(owner, switchedBody);
  await wait(1_000);
  assert.equal((await maya.body()).includes(switchedBody), false);
  await openEvent(maya, eventId, title);
  await maya.eventually(async () => (await maya.body()).includes(switchedBody), 'server history converges after route return');
  assert.equal(await countText(maya, switchedBody), 1);

  execFileSync('docker', ['stop', 'supabase_realtime_family-loop'], { stdio: 'ignore' });
  realtimeStopped = true;
  await wait(1_000);
  const reconnectBody = `Browser reconnect once ${marker}`;
  await sendComment(owner, reconnectBody);
  await wait(1_000);
  assert.equal((await maya.body()).includes(reconnectBody), false, 'comment is genuinely missed while Realtime is stopped');
  execFileSync('docker', ['start', 'supabase_realtime_family-loop'], { stdio: 'ignore' });
  realtimeStopped = false;
  await maya.eventually(async () => (await maya.body()).includes(reconnectBody), 'reconnect refetches missed comment', 30_000);
  assert.equal(await countText(maya, reconnectBody), 1);

  console.log('Browser realtime PASS: live=once; otherEvent=isolated; switchedRoute=inert; reconnect=once; outsider=none');
} finally {
  if (realtimeStopped) execFileSync('docker', ['start', 'supabase_realtime_family-loop'], { stdio: 'ignore' });
  await Promise.allSettled(pages.map((page) => page.close()));
  await wait(500);
  if (eventId && ownerToken) await api(`/rest/v1/loopedin_events?id=eq.${eventId}`, ownerToken, { method: 'DELETE' });
}
